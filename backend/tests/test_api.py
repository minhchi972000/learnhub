from __future__ import annotations

from fastapi.testclient import TestClient

C = "/api/courses/demo-course"


def test_health_and_list(client: TestClient):
    assert client.get("/api/health").json() == {"status": "ok", "env": "dev", "courses": 1}
    [course] = client.get("/api/courses").json()
    assert course["slug"] == "demo-course"
    assert (course["unit_count"], course["lesson_count"], course["completed_lessons"]) == (2, 3, 0)
    assert course["card_count"] == 2


def test_unknown_resources_404(client: TestClient):
    assert client.get("/api/courses/nope").status_code == 404
    assert client.get(f"{C}/units/nope/quiz").status_code == 404
    assert client.get(f"{C}/units/basics/lessons/nope").status_code == 404


def test_lesson_navigation_crosses_units(client: TestClient):
    second = client.get(f"{C}/units/basics/lessons/second").json()
    assert second["prev"]["lesson"] == "intro"
    assert second["next"] == {"unit": "more", "lesson": "third", "title": "Third"}
    first = client.get(f"{C}/units/basics/lessons/intro").json()
    assert first["prev"] is None and first["markdown"].startswith("## Hello")


def test_lesson_progress_roundtrip(client: TestClient):
    url = f"{C}/units/basics/lessons/intro/progress"
    assert client.put(url, json={"completed": True}).json()["completed"] is True
    client.put(url, json={"completed": True})  # idempotent
    detail = client.get(C).json()
    assert detail["completed_lessons"] == 1
    assert detail["units"][0]["lessons"][0]["completed"] is True

    client.put(url, json={"completed": False})
    assert client.get(C).json()["completed_lessons"] == 0


def test_quiz_hides_answers_and_grades(client: TestClient):
    quiz = client.get(f"{C}/units/basics/quiz").json()
    assert quiz["attempts"] == 0 and quiz["best_percent"] is None
    for q in quiz["questions"]:
        assert "answer" not in q and "explanation" not in q

    answers = {"q-single": 1, "q-multi": [0], "q-tf": True, "q-fill": " IN "}
    result = client.post(f"{C}/units/basics/quiz/attempts", json={"answers": answers}).json()
    assert (result["score"], result["total"], result["percent"]) == (3, 4, 75.0)
    by_id = {r["id"]: r for r in result["results"]}
    assert by_id["q-multi"]["correct"] is False and by_id["q-multi"]["correct_answer"] == [0, 2]
    assert by_id["q-single"]["explanation"] == "B is right"

    quiz = client.get(f"{C}/units/basics/quiz").json()
    assert quiz["attempts"] == 1 and quiz["best_percent"] == 75.0

    stats = client.get(f"{C}/stats").json()
    assert stats["quiz_units_attempted"] == 1 and stats["quiz_average_best_percent"] == 75.0
    assert stats["recent_attempts"][0]["unit_title"] == "Basics"


def test_flashcard_queue_and_review(client: TestClient):
    due = client.get(f"{C}/flashcards/due").json()
    assert (due["due_count"], due["new_count"]) == (0, 2)
    assert [c["id"] for c in due["cards"]] == ["c1", "c2"] and due["cards"][0]["is_new"]

    r = client.post(f"{C}/flashcards/reviews", json={"unit": "basics", "card_id": "c1", "rating": "good"}).json()
    assert (r["reps"], r["interval_days"]) == (1, 1)

    due = client.get(f"{C}/flashcards/due").json()
    assert [c["id"] for c in due["cards"]] == ["c2"]  # c1 is scheduled for tomorrow
    assert client.get(f"{C}/stats").json()["cards_learned"] == 1

    assert client.get(f"{C}/flashcards/due", params={"new_limit": 0}).json()["cards"] == []
    assert client.get(f"{C}/flashcards/due", params={"unit": "nope"}).status_code == 404
    bad = client.post(f"{C}/flashcards/reviews", json={"unit": "basics", "card_id": "zzz", "rating": "good"})
    assert bad.status_code == 404
    bad = client.post(f"{C}/flashcards/reviews", json={"unit": "basics", "card_id": "c1", "rating": "meh"})
    assert bad.status_code == 422


def test_all_cards_grouped_by_unit(client: TestClient):
    [unit] = client.get(f"{C}/flashcards").json()  # unit "more" has no cards, so it is left out
    assert (unit["slug"], unit["order"], unit["title"]) == ("basics", 1, "Basics")
    assert [(c["id"], c["example"], c["learned"]) for c in unit["cards"]] == [("c1", "", False), ("c2", "two apples", False)]

    client.post(f"{C}/flashcards/reviews", json={"unit": "basics", "card_id": "c1", "rating": "good"})
    learned = {c["id"]: c["learned"] for c in client.get(f"{C}/flashcards").json()[0]["cards"]}
    assert learned == {"c1": True, "c2": False}
    assert client.get("/api/courses/nope/flashcards").status_code == 404


def test_learner_header_isolates_progress(client: TestClient):
    client.put(f"{C}/units/basics/lessons/intro/progress", json={"completed": True}, headers={"X-Learner": "alice"})
    assert client.get(C, headers={"X-Learner": "alice"}).json()["completed_lessons"] == 1
    assert client.get(C).json()["completed_lessons"] == 0
