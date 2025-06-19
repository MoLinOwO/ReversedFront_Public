import os
import json
from .config_utils import get_account_file

DEFAULT_ACCOUNT_DATA = {'accounts': [], 'active': 0}


def ensure_account_file():
    ACCOUNT_FILE = get_account_file()
    if not os.path.exists(ACCOUNT_FILE):
        with open(ACCOUNT_FILE, 'w', encoding='utf-8') as f:
            json.dump(DEFAULT_ACCOUNT_DATA, f, ensure_ascii=False)
    else:
        try:
            with open(ACCOUNT_FILE, 'r', encoding='utf-8') as f:
                data = f.read()
                if not data.strip():
                    raise ValueError('Empty file')
                json.loads(data)
        except Exception:
            with open(ACCOUNT_FILE, 'w', encoding='utf-8') as f:
                json.dump(DEFAULT_ACCOUNT_DATA, f, ensure_ascii=False)


def get_accounts():
    ensure_account_file()
    ACCOUNT_FILE = get_account_file()
    with open(ACCOUNT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return data.get('accounts', [])


def add_account(data):
    ensure_account_file()
    ACCOUNT_FILE = get_account_file()
    with open(ACCOUNT_FILE, 'r', encoding='utf-8') as f:
        filedata = json.load(f)
        accounts = filedata.get('accounts', [])
        active = filedata.get('active', 0)
    found = False
    for i, acc in enumerate(accounts):
        if acc['account'] == data['account']:
            accounts[i]['password'] = data['password']
            active = i
            found = True
            break
    if not found:
        accounts.append(data)
        active = len(accounts)-1
    with open(ACCOUNT_FILE, 'w', encoding='utf-8') as f:
        json.dump({'accounts': accounts, 'active': active}, f, ensure_ascii=False)
    return True


def delete_account(idx):
    ensure_account_file()
    ACCOUNT_FILE = get_account_file()
    with open(ACCOUNT_FILE, 'r', encoding='utf-8') as f:
        filedata = json.load(f)
    accounts = filedata.get('accounts', [])
    active = filedata.get('active', 0)
    if 0 <= idx < len(accounts):
        accounts.pop(idx)
        if active >= len(accounts):
            active = max(0, len(accounts)-1)
        with open(ACCOUNT_FILE, 'w', encoding='utf-8') as f:
            json.dump({'accounts': accounts, 'active': active}, f, ensure_ascii=False)
        return True
    return False


def set_active_account(idx):
    ensure_account_file()
    ACCOUNT_FILE = get_account_file()
    with open(ACCOUNT_FILE, 'r', encoding='utf-8') as f:
        filedata = json.load(f)
    accounts = filedata.get('accounts', [])
    if 0 <= idx < len(accounts):
        with open(ACCOUNT_FILE, 'w', encoding='utf-8') as f:
            json.dump({'accounts': accounts, 'active': idx}, f, ensure_ascii=False)
        return True
    return False


def get_active_account():
    ensure_account_file()
    ACCOUNT_FILE = get_account_file()
    with open(ACCOUNT_FILE, 'r', encoding='utf-8') as f:
        filedata = json.load(f)
        accounts = filedata.get('accounts', [])
        active = filedata.get('active', 0)
        if accounts and 0 <= active < len(accounts):
            return accounts[active]
    return None
