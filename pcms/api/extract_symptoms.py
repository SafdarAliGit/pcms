import re
import pandas as pd
import language_tool_python

class SymptomExtractor:
    def __init__(self, symptoms_csv_path):
        self.tool = language_tool_python.LanguageTool('en-US')
        self.body_parts = {
            'head', 'neck', 'chest', 'back', 'arm', 'leg', 'hand', 'foot',
            'eye', 'ear', 'nose', 'mouth', 'stomach', 'abdomen', 'pelvis',
            'shoulder', 'knee', 'elbow', 'wrist', 'ankle', 'finger', 'toe',
            'thumb', 'hip', 'thigh', 'shin', 'calf', 'heel', 'sole', 'palm',
            'brain', 'heart', 'lung', 'liver', 'kidney', 'intestine', 'colon',
            'bladder', 'pancreas', 'spleen', 'gallbladder', 'appendix'
        }
        self.helper_words = {
            'and', 'or', 'the', 'a', 'an', 'is', 'am', 'are', 'was', 'were',
            'have', 'has', 'had', 'do', 'does', 'did', 'may', 'might', 'can',
            'could', 'shall', 'should', 'will', 'would', 'must', 'being'
        }
        self.master_symptoms = self._load_symptoms(symptoms_csv_path)

    def _load_symptoms(self, csv_path):
        """Load and preprocess symptoms from CSV"""
        disease_db = pd.read_csv(csv_path)
        disease_db['symptoms_list'] = disease_db['common_symptom'].fillna('').str.lower().str.split(', ')
        
        master_symptoms = set()
        for sublist in disease_db['symptoms_list']:
            for symptom in sublist:
                if symptom:
                    words = symptom.split()
                    if len(words) == 1 and (words[0] in self.body_parts or words[0] in self.helper_words):
                        continue
                    unique_words = []
                    seen_words = set()
                    for word in words:
                        if word not in seen_words:
                            seen_words.add(word)
                            unique_words.append(word)
                    cleaned = ' '.join(unique_words)
                    master_symptoms.add(cleaned)
        return master_symptoms

    def _format_symptoms(self, symptom_set):
        """Format symptoms list into natural language string"""
        if not symptom_set:
            return "No symptoms found"
        symptoms = sorted(symptom_set, key=lambda x: (-len(x), x))
        if len(symptoms) == 1:
            return "Symptom is: " + symptoms[0]
        return "Symptoms are: " + ', '.join(symptoms[:-1]) + ' and ' + symptoms[-1]

    def _extract_exact_symptoms(self, text):
        """Extract only exact matches from master symptoms"""
        txt = text.lower()
        found = set()
        
        for symptom in sorted(self.master_symptoms, key=lambda x: -len(x)):
            pattern = r'(^|\s)' + re.escape(symptom) + r'(\s|$|[.,;])'
            if re.search(pattern, txt):
                found.add(symptom)
                txt = re.sub(pattern, ' ', txt)
        return found

    def get_patient_symptoms(self, patient_text):
        """Main method to get corrected symptom string"""
        corrected_text = self.tool.correct(patient_text.lower())
        extracted = self._extract_exact_symptoms(corrected_text)
        return self._format_symptoms(extracted)