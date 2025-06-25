from transformers import pipeline
from pydub import AudioSegment


def extract_and_format(text, threshold=0.8):

    ner = pipeline(
    "ner",
    model="AventIQ-AI/bert-medical-entity-extraction",
    tokenizer="AventIQ-AI/bert-medical-entity-extraction",
    aggregation_strategy="none"
    )

    LABEL_MAP = {
    "LABEL_0": "O",
    "LABEL_1": "Drug",
    "LABEL_2": "Disease",
    "LABEL_3": "Symptom",
    "LABEL_4": "Treatment"
    }

    # Terms to ignore (common anatomy, not symptoms/diseases)
    IGNORE_TERMS = {
    # Body parts (singular + plural)
    "head","heads","neck","necks","chest","chests","abdomen","abdomens",
    "back","backs","pelvis","pelvises","shoulder","shoulders","arm","arms",
    "elbow","elbows","forearm","forearms","wrist","wrists","hand","hands",
    "finger","fingers","thumb","thumbs","hip","hips","thigh","thighs",
    "knee","knees","leg","legs","ankle","ankles","foot","feet","toe","toes",
    "calf","calves","buttock","buttocks","breast","breasts","genital","genitals",
    "ear","ears","eye","eyes","nose","noses","mouth","lips","lip","jaw","jaws",
    "tongue","skin","hair","nail","nails","joint","joints",

    # Anatomical regions/cavities
    "cranial","facial","thoracic","abdominal","pelvic","axillary","brachial",
    "antecubital","antebrachial","carpal","palmar","tarsal","plantar","dorsal",
    "ventral","orbital","ocular","buccal","auricle","otic","oral","mental",
    "scapular","lumbar","sacral","anal","calcaneal","phalangeal","coxal","patellar",
    "crural","sternal","umbilical","mammary","inguinal","femoral","dewlap",

    # Directional terms
    "anterior","posterior","superior","inferior","medial","lateral","proximal",
    "distal","external","internal","superficial","deep","prone","supine",
    "bilateral","unilateral","contralateral","ipsilateral","cranial","caudal",
    "rostral","central","peripheral"
    }
    raw = ner(text)
    merged, current = [], None

    for tok in raw:
        w, ent, s = tok["word"], tok["entity"], tok["score"]
        lbl = LABEL_MAP[ent]

        if w.startswith("##") and current:
            current["word"] += w[2:]
            current["score_sum"] += s
            current["count"] += 1
        else:
            if current:
                current["score"] = current["score_sum"] / current["count"]
                merged.append(current)
            current = {"word": w, "label": lbl, "score_sum": s, "count": 1}
    if current:
        current["score"] = current["score_sum"] / current["count"]
        merged.append(current)

    # Combine Diseases & Symptoms, filter irrelevant anatomy terms
    symptoms = [
        m["word"] for m in merged
        if m["label"] in ("Disease", "Symptom")
           and m["score"] >= threshold
           and m["word"].lower() not in IGNORE_TERMS
    ]
    symptoms = list(dict.fromkeys(symptoms))

    if not symptoms:
        return "Patient has no detected symptoms."

    # Build the spoken summary, keeping it concise for TTS clarity
    summary = "Patient has the following symptoms: " + ", ".join(symptoms) + "."
    return summary

