use serde::{Deserialize, Serialize};
use serde_json::Value;
use crate::config_manager::{load_config, update_config_fields};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Account {
    pub account: String,
    pub password: Option<String>,
    // Add other fields as needed
}

pub fn get_accounts() -> Vec<Value> {
    let config = load_config();
    if let Some(accounts) = config.get("accounts") {
        if let Some(arr) = accounts.as_array() {
            return arr.clone();
        }
    }
    Vec::new()
}

pub fn add_account(data: Value) -> bool {
    let config = load_config();
    let mut accounts = if let Some(acc) = config.get("accounts").and_then(|a| a.as_array()) {
        acc.clone()
    } else {
        Vec::new()
    };

    // Check for duplicates (simplified logic)
    // In Python it checks account name
    let new_account_name = data.get("account").and_then(|v| v.as_str());
    if let Some(name) = new_account_name {
        for acc in &accounts {
            if acc.get("account").and_then(|v| v.as_str()) == Some(name) {
                return false; // Already exists
            }
        }
    }

    accounts.push(data);
    
    update_config_fields(serde_json::json!({
        "accounts": accounts
    }));
    
    true
}

pub fn delete_account(idx: usize) -> bool {
    let config = load_config();
    let mut accounts = if let Some(acc) = config.get("accounts").and_then(|a| a.as_array()) {
        acc.clone()
    } else {
        return false;
    };

    if idx < accounts.len() {
        accounts.remove(idx);
        update_config_fields(serde_json::json!({
            "accounts": accounts
        }));
        
        // Also update active_account_index if needed
        let active_idx = config.get("active_account_index").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
        if active_idx >= idx && active_idx > 0 {
             update_config_fields(serde_json::json!({
                "active_account_index": active_idx - 1
            }));
        }
        
        return true;
    }
    
    false
}

pub fn set_active_account(idx: usize) -> bool {
    let config = load_config();
    let accounts = if let Some(acc) = config.get("accounts").and_then(|a| a.as_array()) {
        acc
    } else {
        return false;
    };

    if idx < accounts.len() {
        update_config_fields(serde_json::json!({
            "active_account_index": idx
        }));
        return true;
    }
    
    false
}

pub fn get_active_account() -> Option<Value> {
    let config = load_config();
    let idx = config.get("active_account_index").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
    let accounts = config.get("accounts").and_then(|a| a.as_array())?;
    
    if idx < accounts.len() {
        return Some(accounts[idx].clone());
    }
    
    None
}
