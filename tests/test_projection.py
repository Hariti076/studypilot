from api.services.study_plan import project_scores, subject_risk


def test_weaker_subjects_receive_more_of_the_gain():
    projected = project_scores([55, 82], plan_gain=4)
    assert projected[0] - 55 > projected[1] - 82


def test_zero_gain_leaves_current_scores():
    currents = [55, 62, 74, 82]
    assert project_scores(currents, 0) == currents


def test_subject_risk_rules():
    assert subject_risk(54, 30) == "High"
    assert subject_risk(60, 10) == "High"
    assert subject_risk(60, 11) == "Medium"
    assert subject_risk(75, 5) == "Low"
