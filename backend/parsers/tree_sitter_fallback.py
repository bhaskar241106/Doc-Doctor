import re
import logging
from typing import Dict, Any, List

logger = logging.getLogger("tree_sitter_fallback")

class GeneralStructuralParser:
    @staticmethod
    def parse_blocks(content: str, language: str) -> Dict[str, Any]:
        """A robust curly-brace matching parser that extracts classes and functions from JS/TS/Go/Java/C++."""
        classes = []
        functions = []
        
        lines = content.splitlines()
        content_len = len(content)
        
        # Regexes for structure matching depending on language
        class_patterns = []
        func_patterns = []
        
        if language in ("javascript", "typescript"):
            # Matches: class Foo, export class Foo, class Foo extends Bar
            class_patterns = [r'(?:export\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?']
            # Matches: function foo(...), async function foo(...), const foo = (...) =>, foo(bar) {
            func_patterns = [
                r'(?:async\s+)?function\s+(\w+)\s*\(',
                r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(.*?\)\s*=>',
                r'(?:public|private|protected|async|static)?\s*(\w+)\s*\([^)]*\)\s*\{(?!$)' # methods in classes
            ]
        elif language == "go":
            # Go structs are like classes
            class_patterns = [r'type\s+(\w+)\s+struct']
            # Go functions: func foo(...), func (r *Rec) foo(...)
            func_patterns = [
                r'func\s+(\w+)\s*\(',
                r'func\s*\([^)]+\)\s+(\w+)\s*\('
            ]
        elif language in ("java", "csharp"):
            class_patterns = [r'(?:public|private|protected|internal|static)?\s*class\s+(\w+)']
            func_patterns = [r'(?:public|private|protected|internal|static|async)?\s+[\w<>]+\s+(\w+)\s*\([^)]*\)\s*(?:{|throws)']
        else:
            # Generic catch-all regexes
            class_patterns = [r'class\s+(\w+)']
            func_patterns = [r'function\s+(\w+)\s*\(']

        # Scan for structures
        for idx, line in enumerate(lines):
            # Check classes
            for pat in class_patterns:
                match = re.search(pat, line)
                if match:
                    name = match.group(1)
                    body, end_idx = GeneralStructuralParser._extract_braced_block(content, lines, idx)
                    classes.append({
                        "name": name,
                        "start_line": idx + 1,
                        "end_line": end_idx + 1,
                        "content": body
                    })
                    break # Only one match per line

            # Check functions
            for pat in func_patterns:
                match = re.search(pat, line)
                if match:
                    name = match.group(1)
                    # Skip common keywords mistaken for functions
                    if name in ("if", "for", "switch", "while", "catch", "constructor"):
                        continue
                    body, end_idx = GeneralStructuralParser._extract_braced_block(content, lines, idx)
                    functions.append({
                        "name": name,
                        "start_line": idx + 1,
                        "end_line": end_idx + 1,
                        "content": body
                    })
                    break

        return {
            "classes": classes,
            "functions": functions,
            "success": len(classes) > 0 or len(functions) > 0
        }

    @staticmethod
    def _extract_braced_block(content: str, lines: List[str], start_line_idx: int) -> tuple[str, int]:
        """Climbs through the file content to find the matching closing curly brace from the start line."""
        # Join lines from the start line
        search_sub = "\n".join(lines[start_line_idx:])
        
        brace_count = 0
        has_opened = False
        chars = list(search_sub)
        end_char_pos = 0
        
        for pos, char in enumerate(chars):
            if char == "{":
                brace_count += 1
                has_opened = True
            elif char == "}":
                brace_count -= 1
                
            if has_opened and brace_count == 0:
                end_char_pos = pos
                break
                
        if not has_opened:
            # If no braces exist, just return the first 5 lines
            body = "\n".join(lines[start_line_idx:start_line_idx+5])
            return body, start_line_idx + 4
            
        block_text = search_sub[:end_char_pos+1]
        lines_in_block = block_text.count("\n")
        return block_text, start_line_idx + lines_in_block

def parse_general_file(content: str, filename: str) -> Dict[str, Any]:
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    lang_map = {
        "js": "javascript",
        "jsx": "javascript",
        "ts": "typescript",
        "tsx": "typescript",
        "go": "go",
        "java": "java",
        "cs": "csharp",
        "cpp": "cpp",
        "rs": "rust"
    }
    lang = lang_map.get(ext, "text")
    
    if lang == "text":
        return {"classes": [], "functions": [], "success": False}
        
    return GeneralStructuralParser.parse_blocks(content, lang)
