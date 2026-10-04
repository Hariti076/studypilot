"""Load scikit-learn 1.6.1 artifacts on a newer scikit-learn.

The shipped joblibs were trained with scikit-learn 1.6.1. This process may be
running a newer release (the host has 3.14, which cannot install 1.6.1).
Two private attributes moved between those releases. Restoring them lets the
original estimators run without rewriting or retraining the models.
"""
from __future__ import annotations


def install_unpickle_compat() -> None:
    """Register the private class name that 1.6 pickles look up."""
    import sklearn.compose._column_transformer as column_transformer

    if hasattr(column_transformer, "_RemainderColsList"):
        return

    class _RemainderColsList(list):
        """List subclass used by ColumnTransformer in scikit-learn 1.6."""

    column_transformer._RemainderColsList = _RemainderColsList


def patch_loaded_estimator(estimator) -> None:
    """Give 1.6 imputers the attribute SimpleImputer.transform expects now."""
    from sklearn.impute import SimpleImputer

    seen: set[int] = set()

    def walk(node) -> None:
        if node is None or isinstance(node, (str, bytes, int, float)) or id(node) in seen:
            return
        seen.add(id(node))
        if isinstance(node, SimpleImputer) and not hasattr(node, "_fill_dtype"):
            node._fill_dtype = getattr(node, "_fit_dtype", object)
        for attr in ("steps", "transformers_", "transformers"):
            sequence = getattr(node, attr, None)
            if not sequence:
                continue
            for item in sequence:
                if isinstance(item, tuple) and len(item) >= 2:
                    walk(item[1])

    walk(estimator)
