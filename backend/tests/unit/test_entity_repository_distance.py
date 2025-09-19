import math
from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from backend.database.repositories.entity_repository_v5 import EntityRepositoryV5


@pytest.fixture
def repo_base(monkeypatch):
    repo = EntityRepositoryV5.__new__(EntityRepositoryV5)
    repo.SORT_STRATEGIES = EntityRepositoryV5.SORT_STRATEGIES
    repo.ENTITY_MAPPINGS = EntityRepositoryV5.ENTITY_MAPPINGS
    repo._postgis_available = True
    repo.logger = MagicMock()
    return repo


def test_apply_sorting_uses_distance_expression(repo_base):
    distance_expr = MagicMock()
    distance_expr.asc.return_value = "distance_asc"
    repo_base._build_distance_expression = MagicMock(return_value=distance_expr)

    id_column = MagicMock()
    id_column.asc.return_value = "id_asc"
    model_class = SimpleNamespace(id=id_column, created_at=MagicMock())

    query = MagicMock()
    query.order_by.return_value = "ordered_query"

    filters = {"latitude": 40.0, "longitude": -73.0}

    result = repo_base._apply_sorting(query, model_class, "distance_asc", filters)

    repo_base._build_distance_expression.assert_called_once_with(model_class, 40.0, -73.0)
    query.order_by.assert_called_once_with("distance_asc", "id_asc")
    assert result == "ordered_query"


def test_apply_sorting_distance_fallback(monkeypatch, repo_base):
    repo_base._build_distance_expression = MagicMock(return_value=None)

    recorded = {}

    def fake_desc(column):
        recorded.setdefault("desc", []).append(column)
        return f"DESC({column})"

    def fake_asc(column):
        recorded.setdefault("asc", []).append(column)
        return f"ASC({column})"

    monkeypatch.setattr("backend.database.repositories.entity_repository_v5.desc", fake_desc)
    monkeypatch.setattr("backend.database.repositories.entity_repository_v5.asc", fake_asc)

    created_at_column = "created_at_col"
    id_column = "id_col"
    model_class = SimpleNamespace(created_at=created_at_column, id=id_column)

    query = MagicMock()
    query.order_by.return_value = "ordered_query"

    result = repo_base._apply_sorting(query, model_class, "distance_asc", filters=None)

    query.order_by.assert_called_once_with("DESC(created_at_col)", "DESC(id_col)")
    assert recorded["desc"] == [created_at_column, id_column]
    assert result == "ordered_query"


def test_get_entities_with_cursor_computes_distance(monkeypatch, repo_base):
    # Stub cursor helpers
    monkeypatch.setattr("utils.cursor_v5.create_cursor_v5", lambda **_: "cursor-token")
    monkeypatch.setattr("utils.data_version.get_current_data_version", lambda _entity: "v-test")

    distance_expr = MagicMock()
    distance_expr.label.return_value = distance_expr
    distance_expr.asc.return_value = "distance_order_expr"
    repo_base._build_distance_expression = MagicMock(return_value=distance_expr)

    model_class = SimpleNamespace(
        id=MagicMock(),
        created_at=MagicMock(),
        latitude=MagicMock(),
        longitude=MagicMock(),
    )
    repo_base._model_cache = {"restaurants": model_class}

    session_mock = MagicMock()
    query_mock = MagicMock()
    query_mock.options.return_value = query_mock
    query_mock.add_columns.return_value = query_mock
    query_mock.order_by.return_value = query_mock
    query_mock.filter.return_value = query_mock

    limit_holder = MagicMock()
    limit_holder.all.return_value = [
        (SimpleNamespace(id=1, name="A"), 1609.344),
        (SimpleNamespace(id=2, name="B"), 3218.688),
        (SimpleNamespace(id=3, name="C"), 4828.032),
    ]
    query_mock.limit.return_value = limit_holder

    session_mock.query.return_value = query_mock

    @contextmanager
    def fake_scope():
        yield session_mock

    repo_base.connection_manager = SimpleNamespace(session_scope=fake_scope)
    repo_base._apply_filters = MagicMock(return_value=query_mock)
    repo_base._apply_geospatial_filter = MagicMock(return_value=query_mock)
    repo_base.get_entity_count = MagicMock(return_value=3)

    def entity_to_dict(entity, _include_relations=False):
        return {"id": entity.id, "name": entity.name}

    repo_base._entity_to_dict = MagicMock(side_effect=entity_to_dict)

    results, next_cursor, prev_cursor, total_count = repo_base.get_entities_with_cursor(
        "restaurants",
        cursor=None,
        limit=2,
        sort_key="distance_asc",
        filters={"latitude": 40.0, "longitude": -73.0},
    )

    assert len(results) == 2
    assert math.isclose(results[0]["distance"], 1.0, rel_tol=1e-6)
    assert math.isclose(results[1]["distance"], 2.0, rel_tol=1e-6)
    assert "distance_raw" not in results[0]
    assert next_cursor == "cursor-token"
    assert prev_cursor == "cursor-token"
    assert total_count == 3

    repo_base._build_distance_expression.assert_called()
    query_mock.add_columns.assert_called()
    repo_base.get_entity_count.assert_called_once()
