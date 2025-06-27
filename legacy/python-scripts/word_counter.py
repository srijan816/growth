
import docx
import sys

def count_words_in_docx(file_path):
    try:
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        return len(' '.join(full_text).split())
    except Exception as e:
        return 0

if __name__ == "__main__":
    total_words = 0
    # The first argument is the script name, so we skip it.
    for file_path in sys.argv[1:]:
        total_words += count_words_in_docx(file_path)
    print(total_words)
