use std::env;
use std::fs;
use std::path::{Path, PathBuf};

fn main() {
  let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
  let root_path = Path::new(&manifest_dir).parent().unwrap();
  let web_path = root_path.join("web");
  let resources_path = Path::new(&manifest_dir).join("resources");

  println!("cargo:rerun-if-changed=../web");

  // Clean resources dir if it exists
  if resources_path.exists() {
      // Ignore errors if removal fails (resource busy etc)
      let _ = fs::remove_dir_all(&resources_path);
  }
  fs::create_dir_all(&resources_path).expect("Failed to create resources dir");

  // Copy specific directories and files from web/ to src-tauri/resources/
  let dirs_to_copy = vec!["mod", "tiles", "dexopt", "static"];
  let files_to_copy = vec!["index.html", "manifest.json", "transporter.html"];

  // Copy directories
  for dir_name in dirs_to_copy {
      let src = web_path.join(dir_name);
      let dst = resources_path.join(dir_name);
      if src.exists() {
          copy_dir_recursive(&src, &dst).expect(&format!("Failed to copy {}", dir_name));
      }
  }

  // Copy individual files
  for file_name in files_to_copy {
      let src = web_path.join(file_name);
      let dst = resources_path.join(file_name);
      if src.exists() {
          fs::copy(&src, &dst).expect(&format!("Failed to copy {}", file_name));
      }
  }

  tauri_build::build()
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let dst_path = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_recursive(&entry.path(), &dst_path)?;
        } else {
            fs::copy(entry.path(), dst_path)?;
        }
    }
    Ok(())
}
