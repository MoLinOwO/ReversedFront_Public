fn main() {
    // 使用 winres 設定 Windows 圖標與產物資訊
    let mut res = winres::WindowsResource::new();
    res.set_icon("../logo.ico");
    res.compile().unwrap();
}
