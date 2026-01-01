"""Python 3.14+ Free-threaded 檢測工具"""

import sys
import threading
import os


def detect_free_threaded():
    """檢測當前 Python 是否啟用 Free-threaded (NoGIL) 模式
    
    Returns:
        tuple: (is_free_threaded: bool, gil_status: str, recommendation: str)
    """
    # 檢查 Python 版本
    version = sys.version_info
    is_python_314_plus = version.major == 3 and version.minor >= 14
    
    # 檢查是否有 GIL
    has_gil = True
    gil_status = "GIL 已啟用"
    
    # Python 3.14+ 提供 sys._is_gil_enabled() 函數
    if hasattr(sys, '_is_gil_enabled'):
        has_gil = sys._is_gil_enabled()
        gil_status = "GIL 已啟用" if has_gil else "Free-threaded (NoGIL)"
    
    # 判斷是否為 Free-threaded
    is_free_threaded = is_python_314_plus and not has_gil
    
    # 生成建議
    if is_free_threaded:
        recommendation = "✓ 已啟用 Free-threaded 模式，多線程並行效能最佳"
    elif is_python_314_plus and has_gil:
        recommendation = "⚠ 您使用 Python 3.14+，但未啟用 Free-threaded。建議使用 python3.14t 啟動"
    else:
        recommendation = f"ℹ Python {version.major}.{version.minor} 不支援 Free-threaded。建議升級到 Python 3.14t"
    
    return is_free_threaded, gil_status, recommendation


def print_threading_info():
    """打印當前線程模式資訊"""
    is_ft, gil_status, recommendation = detect_free_threaded()
    cpu_count = os.cpu_count() or 4
    
    print("=" * 60)
    print("Python 並行模式檢測")
    print("=" * 60)
    print(f"Python 版本: {sys.version.split()[0]}")
    print(f"GIL 狀態: {gil_status}")
    print(f"CPU 核心數: {cpu_count}")
    print(f"活動線程數: {threading.active_count()}")
    print(f"建議: {recommendation}")
    print("=" * 60)
    
    return is_ft


def get_optimal_worker_count(io_bound=True):
    """獲取最佳工作線程數
    
    Args:
        io_bound: True 表示 I/O 密集型任務，False 表示 CPU 密集型
        
    Returns:
        int: 建議的工作線程數
    """
    cpu_count = os.cpu_count() or 4
    is_ft, _, _ = detect_free_threaded()
    
    if io_bound:
        # I/O 密集型：無論是否 Free-threaded，都使用較多線程
        return max(4, min(cpu_count * 2, 32))
    else:
        # CPU 密集型
        if is_ft:
            # Free-threaded: 可充分利用多核心
            return cpu_count
        else:
            # 有 GIL: 多線程無法並行，建議使用 multiprocessing
            return 1


if __name__ == "__main__":
    print_threading_info()
