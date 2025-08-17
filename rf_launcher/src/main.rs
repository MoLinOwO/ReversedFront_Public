#![windows_subsystem = "windows"]
use std::{env, fs, io, process::{Command, Stdio}};

// 內嵌 exe 檔案
const REVERSED_FRONT_EXE: &[u8] = include_bytes!("../ReversedFront.exe");

fn main() -> io::Result<()> {
	// 產生臨時檔案路徑
	let temp_dir = env::temp_dir();
	let exe_path = temp_dir.join("ReversedFront.exe");

	// 寫出 exe
	fs::write(&exe_path, REVERSED_FRONT_EXE)?;

	// 啟動 exe 並代理視窗（繼承所有標準 IO）
	let mut child = Command::new(&exe_path)
		.stdin(Stdio::inherit())
		.stdout(Stdio::inherit())
		.stderr(Stdio::inherit())
		.spawn()?;

	let status = child.wait()?;
	println!("ReversedFront.exe 結束，狀態: {}", status);

	// 結束後刪除臨時檔
	let _ = fs::remove_file(&exe_path);
	Ok(())
}
