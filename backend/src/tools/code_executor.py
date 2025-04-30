import ast
import builtins
import contextlib
import io
import sys
import os
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Define a list of safe built-in functions
# Excludes potentially harmful ones like exec, eval, open, __import__
SAFE_BUILTINS = { 
    name: getattr(builtins, name) 
    for name in dir(builtins) 
    if name not in ["exec", "eval", "compile", "open", "__import__", "exit", "quit"]
}

# Add common safe modules
SAFE_MODULES = ["math", "json", "datetime", "time", "collections", "re", "random", "string", "functools", "itertools"]

class RestrictedExecutor:
    """Executes Python code in a restricted environment."""
    def __init__(self, allowed_modules: Optional[List[str]] = None, workspace_dir: Optional[str] = None):
        self.allowed_modules = set(SAFE_MODULES + (allowed_modules or []))
        # Ensure workspace_dir is an absolute path for security
        self.workspace_dir = os.path.abspath(workspace_dir or ".") 
        if not os.path.isdir(self.workspace_dir):
            try:
                os.makedirs(self.workspace_dir)
            except OSError as e:
                logger.error(f"Failed to create workspace directory '{self.workspace_dir}': {e}")
                raise
        self.globals = self._prepare_globals()

    def _prepare_globals(self) -> Dict[str, Any]:
        """Prepare a restricted globals dictionary for code execution."""
        safe_globals = {
            "__builtins__": SAFE_BUILTINS,
            "print": print, # Allow print for output capturing
            "_get_restricted_attribute": self._restricted_getattr, # Helper for safe attribute access
            # Consider adding specific agent tools/functions here if they should be available in the code
            # e.g., "search_web": agent_tools.search_web
        }

        # Import allowed modules safely
        for module_name in self.allowed_modules:
            try:
                # TODO: Implement more robust sandboxing if allowing complex modules like 'os' or 'requests'
                # For now, we just import them. Real sandboxing might need libraries like `RestrictedPython`
                # or running in a separate, truly isolated process/container.
                if module_name == 'os':
                     # Example: Expose only safe os functions
                     safe_globals['os'] = self._get_safe_os_module()
                elif module_name == 'sys':
                     # Example: Expose limited sys attributes
                     safe_globals['sys'] = self._get_safe_sys_module()
                else:
                     module = __import__(module_name)
                     safe_globals[module_name] = module
            except ImportError as e:
                logger.warning(f"Could not import allowed module '{module_name}': {e}")
            except Exception as e:
                 logger.error(f"Error preparing module '{module_name}' for sandbox: {e}", exc_info=True)

        return safe_globals

    def _restricted_getattr(self, obj: Any, name: str) -> Any:
         """Safely get an attribute, preventing access to private/magic methods."""
         if name.startswith('_'):
             raise AttributeError(f"Access to private attribute '{name}' is restricted.")
         return getattr(obj, name)

    def _get_safe_os_module(self):
         """Return a restricted version of the os module."""
         safe_os = {}
         allowed_os_functions = ['path', 'listdir', 'stat', 'makedirs', 'remove', 'rename', 'getcwd', 'chdir']
         for name in allowed_os_functions:
              if hasattr(os, name):
                   safe_os[name] = getattr(os, name)
         # Crucially, restrict path manipulation to within the workspace
         # This needs careful implementation to prevent escapes
         original_join = os.path.join
         def safe_join(*paths):
              # Basic check, needs more robust path canonicalization and validation
              full_path = os.path.abspath(original_join(self.workspace_dir, *paths))
              if not full_path.startswith(self.workspace_dir):
                   raise PermissionError("Path access outside workspace is restricted")
              return full_path
         safe_os['path'] = os.path # Allow os.path but override join if needed, or create a safe wrapper
         # safe_os['path'] = { 'join': safe_join, ... other safe path funcs }
         return type('SafeOS', (), safe_os)() # Create a mock module object

    def _get_safe_sys_module(self):
         """Return a restricted version of the sys module."""
         safe_sys = {}
         allowed_sys_attrs = ['argv', 'platform', 'version_info'] # Example safe attributes
         for attr in allowed_sys_attrs:
              if hasattr(sys, attr):
                   safe_sys[attr] = getattr(sys, attr)
         return type('SafeSys', (), safe_sys)()

    def execute(self, code: str) -> Dict[str, Any]:
        """Executes the given Python code string in a restricted environment.

        Args:
            code: The Python code string to execute.

        Returns:
            A dictionary containing 'stdout', 'stderr', and 'returnValue'.
        """
        logger.info(f"Attempting to execute code snippet:\n--- CODE START ---\n{code}\n--- CODE END ---")
        # Store current working directory and change to workspace
        original_cwd = os.getcwd()
        os.chdir(self.workspace_dir)
        logger.debug(f"Changed CWD to workspace: {self.workspace_dir}")

        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()
        result_value = None
        execution_globals = self.globals.copy() # Use a copy for each execution

        try:
            # Basic validation using AST
            compile(code, "<string>", "exec", flags=ast.PyCF_ONLY_AST)
            logger.debug("Code passed AST validation.")

            # Execute the code using exec within captured I/O streams
            # WARNING: exec is inherently risky. For production, consider using
            # libraries like RestrictedPython or running in a separate process/container.
            with contextlib.redirect_stdout(stdout_capture):
                with contextlib.redirect_stderr(stderr_capture):
                    exec(code, execution_globals)
                    # Convention: If the code sets a variable named 'result', capture it.
                    if "result" in execution_globals:
                        result_value = execution_globals["result"]
                        logger.debug(f"Captured 'result' variable: {result_value}")

            stderr_output = stderr_capture.getvalue()
            if stderr_output:
                 logger.warning(f"Code execution produced STDERR:\n{stderr_output}")

            logger.info("Code executed successfully.")
            return {
                "stdout": stdout_capture.getvalue(),
                "stderr": stderr_output,
                "returnValue": result_value
            }

        except Exception as e:
            stderr_output = stderr_capture.getvalue()
            error_message = f"{stderr_output}\nError during execution: {type(e).__name__}: {e}"
            logger.error(f"Code execution failed: {error_message}", exc_info=True)
            return {
                "stdout": stdout_capture.getvalue(),
                "stderr": error_message,
                "returnValue": None
            }
        finally:
            # Change back to the original directory
            os.chdir(original_cwd)
            logger.debug(f"Restored CWD to: {original_cwd}") 