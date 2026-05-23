import ast
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("ast_parser")

class ASTParser(ast.NodeVisitor):
    def __init__(self, content: str):
        self.content = content
        self.lines = content.splitlines()
        self.imports = []
        self.docstring = ""
        self.classes = []
        self.functions = []
        self.current_class = None

    def get_source_segment(self, start_line: int, end_line: int) -> str:
        """Extract exact code lines from the original content (1-indexed)."""
        try:
            return "\n".join(self.lines[start_line - 1 : end_line])
        except Exception:
            return ""

    def visit_Import(self, node):
        for alias in node.names:
            self.imports.append(f"import {alias.name}")
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        module = node.module or ""
        names = ", ".join([alias.name for alias in node.names])
        self.imports.append(f"from {module} import {names}")
        self.generic_visit(node)

    def visit_Module(self, node):
        self.docstring = ast.get_docstring(node) or ""
        self.generic_visit(node)

    def visit_ClassDef(self, node):
        start_line = node.lineno
        # Try to find the exact end line (for Python 3.8+, end_lineno is supported)
        end_line = getattr(node, "end_lineno", start_line)
        if end_line == start_line:
            # Fallback calculation if end_lineno is missing
            end_line = self._estimate_end_line(start_line)

        cls_content = self.get_source_segment(start_line, end_line)
        cls_doc = ast.get_docstring(node) or ""
        
        cls_data = {
            "name": node.name,
            "start_line": start_line,
            "end_line": end_line,
            "docstring": cls_doc,
            "content": cls_content,
            "bases": [ast.unparse(b) for b in node.bases] if hasattr(ast, "unparse") else []
        }
        self.classes.append(cls_data)

        # Set class context for nested methods
        prev_class = self.current_class
        self.current_class = node.name
        self.generic_visit(node)
        self.current_class = prev_class

    def visit_FunctionDef(self, node):
        self._parse_function(node)

    def visit_AsyncFunctionDef(self, node):
        self._parse_function(node, is_async=True)

    def _parse_function(self, node, is_async: bool = False):
        start_line = node.lineno
        end_line = getattr(node, "end_lineno", start_line)
        if end_line == start_line:
            end_line = self._estimate_end_line(start_line)

        fn_content = self.get_source_segment(start_line, end_line)
        fn_doc = ast.get_docstring(node) or ""
        
        args = []
        for arg in node.args.args:
            args.append(arg.arg)

        fn_data = {
            "name": node.name,
            "class_name": self.current_class,
            "is_async": is_async,
            "start_line": start_line,
            "end_line": end_line,
            "docstring": fn_doc,
            "arguments": args,
            "content": fn_content
        }
        self.functions.append(fn_data)
        # We do not visit children inside functions to avoid nested functions cluttering top-level API maps
        # But we let the visitor continue standard traversal if required.

    def _estimate_end_line(self, start_line: int) -> int:
        """Fallback for older Python versions to estimate block end based on indentation."""
        total_lines = len(self.lines)
        if start_line > total_lines:
            return start_line

        start_indent = len(self.lines[start_line - 1]) - len(self.lines[start_line - 1].lstrip())
        end_line = start_line
        
        for i in range(start_line, total_lines):
            line = self.lines[i]
            if not line.strip():
                continue
            indent = len(line) - len(line.lstrip())
            if indent <= start_indent:
                break
            end_line = i + 1
        return end_line

def parse_python_file(content: str) -> Dict[str, Any]:
    """Parse Python code using robust AST traversal with graceful syntax error catch."""
    try:
        tree = ast.parse(content)
        parser = ASTParser(content)
        parser.visit(tree)
        return {
            "imports": parser.imports,
            "docstring": parser.docstring,
            "classes": parser.classes,
            "functions": parser.functions,
            "success": True
        }
    except SyntaxError as se:
        logger.warning(f"AST Parsing SyntaxError: {se}. Falling back to text/regex parser.")
        return {"success": False, "error": str(se)}
    except Exception as e:
        logger.error(f"AST Parsing general error: {e}")
        return {"success": False, "error": str(e)}
