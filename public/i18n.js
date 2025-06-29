// 国际化配置和管理脚本
class I18n {
    constructor() {
        this.currentLanguage = 'zh'; // 默认中文
        this.translations = {
            zh: {
                // 登录页面
                'password': '密码',
                'enter_admin_password': '请输入管理员密码',
                'login': '登录',
                
                // 通用
                'loading': '加载中...',
                'error': '错误',
                'success': '成功',
                'cancel': '取消',
                'save': '保存',
                'delete': '删除',
                'edit': '编辑',
                'add': '添加',
                'test': '测试',
                'generate': '生成',
                'optional': '可选',
                'required': '必填',
                
                // 认证相关
                'verifying_identity': '正在验证身份...',
                'auth_check_timeout': '如果页面长时间无响应，请',
                'return_to_login': '返回登录页面',
                'unauthorized_access': '未授权访问',
                'need_login_message': '您需要登录才能访问管理页面。',
                'go_to_login': '前往登录',
                'logout': '退出登录',
                
                // Gemini API Keys 部分
                'add_new_gemini_key': '添加新的 Gemini 密钥',
                'name_optional': '名称（可选）',
                'name_placeholder': '例如：个人密钥',
                'name_help': '用于识别的友好名称。如果未提供，将使用自动生成的ID。',
                'api_key_value': 'API 密钥值',
                'enter_gemini_api_key': '请输入 Gemini API 密钥',
                'add_gemini_key': '添加 Gemini 密钥',
                'run_all_test': '运行所有测试',
                'loading_keys': '加载密钥中...',
                
                // Worker API Keys 部分
                'add_new_worker_key': '添加新的 Worker 密钥',
                'generate_or_enter_key': '生成或输入强密钥',
                'generate_random_key': '生成随机密钥',
                'description_optional': '描述（可选）',
                'description_placeholder': '例如：客户端应用 A',
                'add_worker_key': '添加 Worker 密钥',
                'safety_settings_help': '安全设置：默认启用。禁用时，模型允许生成 NSFW 内容。',
                
                // Models 部分
                'add_model': '添加模型',
                'model_id': '模型 ID',
                'model_id_placeholder': '例如：gemini-1.5-flash-latest',
                'model_id_help': '选择或输入模型 ID',
                'category': '类别',
                'daily_quota_custom': '每日配额（自定义）',
                'quota_placeholder': '例如：1500，或 \'none\'/\'0\' 表示无限制',
                'quota_help': '仅适用于"自定义"类别。设置此特定模型的每日最大请求数。输入 \'none\' 或 \'0\' 表示无限制。',
                'set_category_quotas': '设置类别配额',
                'loading_models': '加载模型中...',
                
                // 配额设置模态框
                'set_category_quotas_title': '设置类别配额',
                'pro_models_daily_quota': 'Pro 模型每日配额',
                'flash_models_daily_quota': 'Flash 模型每日配额',
                'save_quotas': '保存配额',
                
                // 独立配额模态框
                'set_quota': '设置配额',
                'individual_daily_quota': '独立配额',
                'individual_quota_placeholder': '默认：0（无独立配额）',
                'individual_quota_help': '输入 0 表示无独立配额。独立配额将覆盖类别配额。',
                'save_quota': '保存配额',
                
                // 测试进度
                'running_all_tests': '正在运行所有测试',
                'progress': '进度',
                'preparing_tests': '准备测试中...',
                
                // 按钮和操作
                'set_individual_quota': '设置独立配额',
                'ignore_error': '忽略错误',
                'clear_error': '清除错误',

                // 弹窗和动态内容
                'id': 'ID',
                'key_preview': '密钥预览',
                'total_usage_today': '今日总使用量',
                'date': '日期',
                'error_status': '错误状态',
                'category_usage': '类别使用情况',
                'pro_models': 'Pro 模型',
                'flash_models': 'Flash 模型',
                'test_api_key': '测试 API 密钥',
                'select_a_model': '选择一个模型...',
                'run_test': '运行测试',
                'testing': '测试中...',
                'test_passed': '测试通过！',
                'test_failed': '测试失败。',
                'status': '状态',
                'response': '响应',
                'no_description': '无描述',
                'created': '创建于',
                'safety_settings': '安全设置',
                'enabled': '已启用',
                'disabled': '已禁用',
                'unlimited': '无限制',
                'individual_quota': '独立配额',
                'quota': '配额',
                'set_quota_btn': '设置配额',
                'delete_confirm_gemini': '您确定要删除 Gemini 密钥 ID：{0} 吗？',
                'delete_confirm_worker': '您确定要删除 Worker 密钥：{0} 吗？',
                'delete_confirm_model': '您确定要删除模型：{0} 吗？',
                'please_select_model': '请选择一个模型进行测试',
                'tests_cancelled': '测试已被用户取消',
                'all_tests_completed': '所有测试已完成！',
                'completed_testing': '已完成测试 {0} 个 Gemini 密钥，使用模型 {1}。',
                'test_run_failed': '测试运行失败',
                'cancelling_tests': '正在取消测试...',
                'testing_batch': '正在测试批次 {0}...',
                'completed_tests': '已完成 {0} / {1} 测试',
                'no_gemini_keys_found': '未找到要测试的 Gemini 密钥。',
                'network_error': '网络错误',
                'test_failed_no_response': '测试失败：服务器无响应',
                'test_failed_network': '测试失败：网络错误 - {0}',
                'unknown_error': '未知错误',
                'test_run_cancelled': '测试运行已取消。',
                'failed_to_run_tests': '运行所有测试失败：{0}'
            },
            en: {
                // 登录页面
                'password': 'Password',
                'enter_admin_password': 'Enter admin password',
                'login': 'Login',
                
                // 通用
                'loading': 'Loading...',
                'error': 'Error',
                'success': 'Success',
                'cancel': 'Cancel',
                'save': 'Save',
                'delete': 'Delete',
                'edit': 'Edit',
                'add': 'Add',
                'test': 'Test',
                'generate': 'Generate',
                'optional': 'Optional',
                'required': 'Required',
                
                // 认证相关
                'verifying_identity': 'Verifying identity...',
                'auth_check_timeout': 'If the page doesn\'t respond for a long time, please',
                'return_to_login': 'return to the login page',
                'unauthorized_access': 'Unauthorized Access',
                'need_login_message': 'You need to log in to access the admin page.',
                'go_to_login': 'Go to Login',
                'logout': 'Logout',
                
                // Gemini API Keys 部分
                'add_new_gemini_key': 'Add New Gemini Key',
                'name_optional': 'Name (Optional)',
                'name_placeholder': 'e.g., Personal Key',
                'name_help': 'A friendly name for identification. If not provided, an auto-generated ID will be used.',
                'api_key_value': 'API Key Value',
                'enter_gemini_api_key': 'Enter Gemini API Key',
                'add_gemini_key': 'Add Gemini Key',
                'run_all_test': 'Run All Test',
                'loading_keys': 'Loading keys...',
                
                // Worker API Keys 部分
                'add_new_worker_key': 'Add New Worker Key',
                'generate_or_enter_key': 'Generate or enter a strong key',
                'generate_random_key': 'Generate Random Key',
                'description_optional': 'Description (Optional)',
                'description_placeholder': 'e.g., Client App A',
                'add_worker_key': 'Add Worker Key',
                'safety_settings_help': 'Safety Settings: Enabled by default. When disabled, the model is allowed to generate NSFW content.',
                
                // Models 部分
                'add_model': 'Add Model',
                'model_id': 'Model ID',
                'model_id_placeholder': 'e.g., gemini-1.5-flash-latest',
                'model_id_help': 'Select or enter model ID',
                'category': 'Category',
                'daily_quota_custom': 'Daily Quota (Custom)',
                'quota_placeholder': 'e.g., 1500, or \'none\'/\'0\' for unlimited',
                'quota_help': 'Only for \'Custom\' category. Sets max daily requests for this specific model. Enter \'none\' or \'0\' for unlimited.',
                'set_category_quotas': 'Set Category Quotas',
                'loading_models': 'Loading models...',
                
                // 配额设置模态框
                'set_category_quotas_title': 'Set Category Quotas',
                'pro_models_daily_quota': 'Pro Models Daily Quota',
                'flash_models_daily_quota': 'Flash Models Daily Quota',
                'save_quotas': 'Save Quotas',
                
                // 独立配额模态框
                'set_quota': 'Set Quota',
                'individual_daily_quota': 'Individual Daily Quota',
                'individual_quota_placeholder': 'Default: 0 (No individual quota)',
                'individual_quota_help': 'Enter 0 for no individual quota. Individual quota is applied in addition to category quota.',
                'save_quota': 'Save Quota',
                
                // 测试进度
                'running_all_tests': 'Running All Tests',
                'progress': 'Progress',
                'preparing_tests': 'Preparing tests...',
                
                // 按钮和操作
                'set_individual_quota': 'Set Individual Quota',
                'ignore_error': 'Ignore Error',
                'clear_error': 'Clear Error',

                // 弹窗和动态内容
                'id': 'ID',
                'key_preview': 'Key Preview',
                'total_usage_today': 'Total Usage Today',
                'date': 'Date',
                'error_status': 'Error Status',
                'category_usage': 'Category Usage',
                'pro_models': 'Pro Models',
                'flash_models': 'Flash Models',
                'test_api_key': 'Test API Key',
                'select_a_model': 'Select a model...',
                'run_test': 'Run Test',
                'testing': 'Testing...',
                'test_passed': 'Test Passed!',
                'test_failed': 'Test Failed.',
                'status': 'Status',
                'response': 'Response',
                'no_description': 'No description',
                'created': 'Created',
                'safety_settings': 'Safety Settings',
                'enabled': 'Enabled',
                'disabled': 'Disabled',
                'unlimited': 'Unlimited',
                'individual_quota': 'Individual Quota',
                'quota': 'Quota',
                'set_quota_btn': 'Set Quota',
                'delete_confirm_gemini': 'Are you sure you want to delete Gemini key with ID: {0}?',
                'delete_confirm_worker': 'Are you sure you want to delete Worker key: {0}?',
                'delete_confirm_model': 'Are you sure you want to delete model: {0}?',
                'please_select_model': 'Please select a model to test',
                'tests_cancelled': 'Tests cancelled by user',
                'all_tests_completed': 'All tests completed!',
                'completed_testing': 'Completed testing {0} Gemini keys with model {1}.',
                'test_run_failed': 'Test run failed',
                'cancelling_tests': 'Cancelling tests...',
                'testing_batch': 'Testing batch {0}...',
                'completed_tests': 'Completed {0} of {1} tests',
                'no_gemini_keys_found': 'No Gemini keys found to test.',
                'network_error': 'Network error',
                'test_failed_no_response': 'Test failed: No response from server',
                'test_failed_network': 'Test failed: Network error - {0}',
                'unknown_error': 'Unknown error',
                'test_run_cancelled': 'Test run was cancelled.',
                'failed_to_run_tests': 'Failed to run all tests: {0}'
            }
        };
        
        this.init();
    }
    
    init() {
        // 检测浏览器语言
        this.detectLanguage();
        
        // 创建语言切换按钮
        this.createLanguageToggle();
        
        // 应用翻译
        this.applyTranslations();
        
        // 监听语言变化
        this.setupLanguageChangeListener();
    }
    
    detectLanguage() {
        // 首先检查本地存储
        const savedLanguage = localStorage.getItem('preferred-language');
        if (savedLanguage && this.translations[savedLanguage]) {
            this.currentLanguage = savedLanguage;
            return;
        }
        
        // 检测浏览器语言
        const browserLanguage = navigator.language || navigator.userLanguage;
        if (browserLanguage.startsWith('zh')) {
            this.currentLanguage = 'zh';
        } else {
            this.currentLanguage = 'en';
        }
        
        // 保存到本地存储
        localStorage.setItem('preferred-language', this.currentLanguage);
    }
    
    createLanguageToggle() {
        // 查找深色模式切换按钮的容器
        const darkModeContainer = document.querySelector('#dark-mode-toggle')?.parentElement;
        if (!darkModeContainer) return;
        
        // 创建语言切换按钮
        const languageToggle = document.createElement('button');
        languageToggle.id = 'language-toggle';
        languageToggle.className = 'bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium p-2 rounded flex items-center justify-center h-[38px] w-[38px]';
        languageToggle.innerHTML = this.currentLanguage === 'zh' ? '中' : 'EN';
        languageToggle.title = this.currentLanguage === 'zh' ? '切换到英文' : 'Switch to Chinese';
        
        // 插入到深色模式按钮之前
        darkModeContainer.insertBefore(languageToggle, darkModeContainer.firstChild);
        
        // 添加点击事件
        languageToggle.addEventListener('click', () => {
            this.toggleLanguage();
        });
    }
    
    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
        localStorage.setItem('preferred-language', this.currentLanguage);
        
        // 更新按钮文本
        const toggle = document.getElementById('language-toggle');
        if (toggle) {
            toggle.innerHTML = this.currentLanguage === 'zh' ? '中' : 'EN';
            toggle.title = this.currentLanguage === 'zh' ? '切换到英文' : 'Switch to Chinese';
        }
        
        // 应用翻译
        this.applyTranslations();
        
        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: this.currentLanguage } 
        }));
    }
    
    translate(key, ...args) {
        let translation = this.translations[this.currentLanguage][key] || key;

        // 支持参数替换，例如 translate('message', 'arg1', 'arg2')
        if (args.length > 0) {
            args.forEach((arg, index) => {
                translation = translation.replace(`{${index}}`, arg);
            });
        }

        return translation;
    }
    
    applyTranslations() {
        // 翻译所有带有 data-i18n 属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.translate(key);
            
            if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'password')) {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // 翻译所有带有 data-i18n-placeholder 属性的元素
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.translate(key);
        });
        
        // 翻译所有带有 data-i18n-title 属性的元素
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.translate(key);
        });
    }
    
    setupLanguageChangeListener() {
        // 监听DOM变化，自动翻译新添加的元素
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 翻译新添加的元素
                        if (node.hasAttribute && node.hasAttribute('data-i18n')) {
                            const key = node.getAttribute('data-i18n');
                            const translation = this.translate(key);
                            
                            if (node.tagName === 'INPUT' && (node.type === 'text' || node.type === 'password')) {
                                node.placeholder = translation;
                            } else {
                                node.textContent = translation;
                            }
                        }
                        
                        // 翻译新添加元素的子元素
                        if (node.querySelectorAll) {
                            node.querySelectorAll('[data-i18n]').forEach(element => {
                                const key = element.getAttribute('data-i18n');
                                const translation = this.translate(key);
                                
                                if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'password')) {
                                    element.placeholder = translation;
                                } else {
                                    element.textContent = translation;
                                }
                            });
                            
                            node.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
                                const key = element.getAttribute('data-i18n-placeholder');
                                element.placeholder = this.translate(key);
                            });
                            
                            node.querySelectorAll('[data-i18n-title]').forEach(element => {
                                const key = element.getAttribute('data-i18n-title');
                                element.title = this.translate(key);
                            });
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// 页面加载完成后初始化国际化
document.addEventListener('DOMContentLoaded', () => {
    window.i18n = new I18n();
});

// 全局翻译函数，方便在其他脚本中使用
window.t = function(key, ...args) {
    if (window.i18n) {
        return window.i18n.translate(key, ...args);
    }
    return key;
};
