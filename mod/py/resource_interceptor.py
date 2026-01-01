"""
資源攔截模塊
處理資源下載攔截和注入以及其他前端腳本的注入
"""

import os
import logging

# 禁用日誌輸出
logger = logging.getLogger('ResourceInterceptor')
logger.setLevel(logging.CRITICAL + 1)
logger.disabled = True

def inject_resource_interceptor_eel():
    """注入資源請求攔截 JS 和其他前端功能腳本（PyQt6 版本）"""
    # PyQt6 版本暫時不需要注入，由主視窗處理
    pass
