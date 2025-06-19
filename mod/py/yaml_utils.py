import os

def save_yaml(filename, content):
    # 若 filename 以 mod/data/ 開頭，從專案根目錄拼接
    if filename.startswith('mod/data/'):
        root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
        yaml_path = os.path.join(root, filename)
    else:
        base_path = os.path.abspath(os.path.dirname(__file__))
        yaml_path = os.path.join(base_path, filename)
    os.makedirs(os.path.dirname(yaml_path), exist_ok=True)
    with open(yaml_path, 'w', encoding='utf-8') as f:
        f.write(content)
    return True

def load_yaml(filename):
    if filename.startswith('mod/data/'):
        root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
        yaml_path = os.path.join(root, filename)
    else:
        base_path = os.path.abspath(os.path.dirname(__file__))
        yaml_path = os.path.join(base_path, filename)
    if not os.path.exists(yaml_path):
        return ''
    with open(yaml_path, 'r', encoding='utf-8') as f:
        return f.read()
