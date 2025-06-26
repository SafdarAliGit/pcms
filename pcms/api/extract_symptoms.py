import re
import pandas as pd

class SymptomExtractor:
    def __init__(self, symptoms_csv_path):
        self.body_parts = {
            # Head and Neck
            'head', 'skull', 'scalp', 'forehead', 'temple', 'face', 'jaw', 'chin',
            'neck', 'throat', 'pharynx', 'larynx', 'voicebox', 'adam\'s apple',
            
            # Eyes and Vision
            'eye', 'eyeball', 'eyelid', 'eyelash', 'eyebrow', 'cornea', 'retina',
            'pupil', 'iris', 'sclera', 'tear duct', 'conjunctiva',
            
            # Ears and Hearing
            'ear', 'eardrum', 'earlobe', 'ear canal', 'inner ear', 'middle ear',
            'cochlea', 'auditory canal',
            
            # Nose and Sinuses
            'nose', 'nostril', 'nasal cavity', 'sinus', 'septum', 'bridge',
            
            # Mouth and Throat
            'mouth', 'lip', 'tongue', 'gum', 'palate', 'uvula', 'tonsil', 'tooth',
            'incisor', 'canine', 'molar', 'premolar', 'wisdom tooth', 'salivary gland',
            
            # Upper Body
            'shoulder', 'arm', 'upper arm', 'forearm', 'elbow', 'wrist', 'hand',
            'palm', 'back of hand', 'finger', 'thumb', 'index finger', 'middle finger',
            'ring finger', 'pinky', 'knuckle', 'fingernail', 'bicep', 'tricep',
            
            # Chest and Back
            'chest', 'breast', 'nipple', 'rib', 'ribcage', 'sternum', 'collarbone',
            'clavicle', 'back', 'spine', 'spinal cord', 'vertebra', 'shoulder blade',
            'scapula',
            
            # Abdomen and Pelvis
            'abdomen', 'belly', 'stomach', 'navel', 'belly button', 'pelvis',
            'hip', 'groin', 'pubic area', 'waist',
            
            # Internal Organs - Thoracic
            'heart', 'lung', 'esophagus', 'trachea', 'bronchus', 'diaphragm',
            'aorta', 'pulmonary artery',
            
            # Internal Organs - Abdominal
            'liver', 'kidney', 'spleen', 'pancreas', 'gallbladder', 'bile duct',
            'appendix', 'adrenal gland',
            
            # Digestive System
            'stomach', 'small intestine', 'large intestine', 'colon', 'rectum',
            'anus', 'bowel', 'duodenum', 'jejunum', 'ileum', 'cecum',
            
            # Urinary System
            'bladder', 'urethra', 'ureter', 'prostate',
            
            # Reproductive - Male
            'penis', 'testicle', 'scrotum', 'vas deferens',
            
            # Reproductive - Female
            'vagina', 'vulva', 'clitoris', 'uterus', 'womb', 'ovary', 'fallopian tube',
            'cervix',
            
            # Lower Body
            'leg', 'thigh', 'knee', 'kneecap', 'patella', 'shin', 'calf', 'ankle',
            'foot', 'heel', 'sole', 'arch', 'toe', 'big toe', 'toenail', 'femur',
            'tibia', 'fibula', 'hamstring', 'quadriceps', 'achilles tendon',
            
            # Skin and Related
            'skin', 'pore', 'hair follicle', 'sweat gland', 'sebaceous gland',
            
            # Nervous System
            'brain', 'cerebrum', 'cerebellum', 'brainstem', 'nerve', 'neuron',
            'spinal nerve',
            
            # Circulatory System
            'artery', 'vein', 'capillary', 'blood vessel',
            
            # Musculoskeletal
            'muscle', 'tendon', 'ligament', 'cartilage', 'joint', 'bone', 'marrow',
            
            # Endocrine System
            'thyroid', 'parathyroid', 'pituitary', 'hypothalamus', 'adrenal',
            'pineal gland',
            
            # Lymphatic System
            'lymph node', 'spleen', 'thymus', 'tonsil', 'lymph vessel'
        }

        self.helper_words = {
            # Articles
            'the', 'a', 'an',
            
            # Conjunctions
            'and', 'or', 'but', 'nor', 'for', 'yet', 'so',
            
            # Prepositions
            'of', 'in', 'to', 'for', 'with', 'on', 'at', 'from', 'by', 'about',
            'as', 'into', 'like', 'through', 'after', 'over', 'between', 'out',
            'against', 'during', 'without', 'before', 'under', 'around', 'among',
            
            # Pronouns
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
            'them', 'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours',
            'hers', 'ours', 'theirs',
            
            # Common auxiliary verbs
            'am', 'is', 'are', 'was', 'were', 'be', 'being', 'been',
            'have', 'has', 'had', 'do', 'does', 'did',
            'may', 'might', 'must', 'shall', 'should', 'will', 'would', 'can', 'could',
            
            # Other common words
            'this', 'that', 'these', 'those', 'there', 'here', 'when', 'where',
            'which', 'who', 'whom', 'whose', 'why', 'how', 'what', 'whether',
            'while', 'if', 'because', 'since', 'although', 'though', 'unless',
            'until', 'whenever', 'wherever', 'whatever', 'whoever', 'whichever',
            
            # Negations
            'not', 'no', 'none', 'nobody', 'nothing', 'neither', 'nowhere',
            
            # Quantifiers
            'some', 'any', 'all', 'every', 'each', 'both', 'either', 'most',
            'much', 'many', 'few', 'several', 'enough',
            
            # Miscellaneous
            'very', 'too', 'just', 'only', 'also', 'even', 'still', 'already',
            'really', 'quite', 'rather', 'almost', 'nearly', 'always', 'often',
            'sometimes', 'usually', 'never', 'else', 'probably', 'perhaps',
            'maybe', 'possibly', 'actually', 'basically', 'especially',
            'particularly', 'generally', 'normally', 'typically'
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
                    # Remove leading "and " if present
                    symptom = re.sub(r'^and\s+', '', symptom.strip())
                    if not symptom:  # Skip if empty after removal
                        continue
                        
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
        extracted = self._extract_exact_symptoms(patient_text.lower())
        return self._format_symptoms(extracted)