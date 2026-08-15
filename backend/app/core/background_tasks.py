"""Background tasks management for asyncio coroutines.

Follows official Python asyncio guidelines for fire-and-forget background tasks:
1. Retains strong references in a global set to prevent Garbage Collection (GC) from
   prematurely collecting running tasks mid-execution (weak reference in event loop).
2. Attaches `task.add_done_callback(background_tasks.discard)` to clean up references.
3. Catches and logs unhandled exceptions inside the callback to prevent
   'Task exception was never retrieved' runtime warnings.
"""

import asyncio
import logging
from typing import Any, Callable, Coroutine, TypeVar

logger = logging.getLogger(__name__)

# Strong reference container for running background tasks to prevent GC reclamation
background_tasks: set[asyncio.Task] = set()

T = TypeVar("T")


def create_background_task(
    coro: Coroutine[Any, Any, T],
    name: str | None = None,
    on_error: Callable[[Exception], None] | None = None,
) -> asyncio.Task[T]:
    """Safely spawn a background asyncio Task with strong reference retention and exception logging.

    Args:
        coro: Coroutine to execute in background.
        name: Optional human-readable task name for debugging.
        on_error: Optional error callback when task raises an unhandled exception.

    Returns:
        The created asyncio.Task instance.
    """
    task = asyncio.create_task(coro, name=name)
    background_tasks.add(task)

    def _done_callback(t: asyncio.Task) -> None:
        background_tasks.discard(t)
        if not t.cancelled():
            exc = t.exception()
            if exc:
                task_name = t.get_name()
                logger.error(
                    f"Background task '{task_name}' failed with exception: {exc}",
                    exc_info=exc,
                )
                if on_error:
                    try:
                        on_error(exc)
                    except Exception as err_cb_exc:
                        logger.error(
                            f"Error executing on_error callback for background task '{task_name}': {err_cb_exc}",
                            exc_info=err_cb_exc,
                        )

    task.add_done_callback(_done_callback)
    return task
