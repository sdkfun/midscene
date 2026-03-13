/**
 * 环境配置组件
 *
 * 用于配置和管理 Midscene 的模型环境变量，支持多个模型服务提供商的预设配置。
 *
 * 主要功能：
 * 1. 支持多个模型服务提供商（阿里云千问、火山引擎豆包、智谱 AI、Google Gemini 等）
 * 2. 基础配置：API Key、Base URL、模型名称、模型系列
 * 3. 高级配置：超时时间、采样温度、最大 Token 数、重试配置、代理配置
 * 4. 推理模式配置：推理开关、推理力度、思考 Token 预算
 * 5. 专用模型配置：Insight 专用模型、Planning 专用模型
 * 6. 调试日志配置：AI 调用详情、Token 消耗统计等
 *
 * @module EnvConfig
 */

import { SettingOutlined } from '@ant-design/icons';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Select, Tooltip, message } from 'antd';
import { useRef, useState } from 'react';
import { useEnvConfig } from '../../store/store';

/**
 * 环境变量接口
 *
 * 用于表示单个环境变量的配置信息
 */
interface EnvVar {
  /** 变量键名，如 MIDSCENE_MODEL_API_KEY */
  key: string;
  /** 变量值 */
  value: string;
  /** 自定义显示标签（可选） */
  label?: string;
  /** 是否为预设变量（系统内置的变量） */
  isPreset?: boolean;
  /** 用户自定义的标签名称 */
  customLabel?: string;
  /** 是否正在编辑标签状态 */
  isEditingLabel?: boolean;
}

/**
 * 模型服务提供商配置接口
 *
 * 定义了每个模型服务商的配置模板，包括其所需的环境变量列表
 */
interface ProviderConfig {
  /** 服务商唯一标识 */
  id: string;
  /** 服务商显示名称 */
  name: string;
  /** 服务商描述信息 */
  description?: string;
  /** 环境变量配置列表 */
  envVars: Array<{
    /** 变量键名 */
    key: string;
    /** 变量显示标签 */
    label: string;
    /** 输入框占位符文本 */
    placeholder?: string;
    /** 是否为必填项 */
    required?: boolean;
    /** 输入类型：文本、密码、选择器、数字 */
    type?: 'text' | 'password' | 'select' | 'number';
    /** 选择器选项列表（当 type 为 select 时） */
    options?: Array<{ label: string; value: string }>;
    /** 变量分类：基础、高级、推理、网络、调试 */
    category?: 'basic' | 'advanced' | 'reasoning' | 'network' | 'debug';
    /** 默认值 */
    default?: string;
  }>;
}

/**
 * 通用基础环境变量配置
 *
 * 包含所有模型服务商都需要的基础配置项：
 * - MIDSCENE_MODEL_BASE_URL: API 基础 URL
 * - MIDSCENE_MODEL_API_KEY: API 密钥
 * - MIDSCENE_MODEL_NAME: 模型名称
 * - MIDSCENE_MODEL_FAMILY: 模型系列（带预设选项）
 */
const COMMON_BASIC_VARS: ProviderConfig['envVars'] = [
  {
    key: 'MIDSCENE_MODEL_BASE_URL',
    label: '基础 URL',
    placeholder: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    required: true,
    category: 'basic',
  },
  {
    key: 'MIDSCENE_MODEL_API_KEY',
    label: 'API 密钥',
    placeholder: 'sk-...',
    required: true,
    type: 'password',
    category: 'basic',
  },
  {
    key: 'MIDSCENE_MODEL_NAME',
    label: '模型名称',
    required: true,
    category: 'basic',
  },
  {
    key: 'MIDSCENE_MODEL_FAMILY',
    label: '模型系列',
    required: true,
    type: 'select',
    category: 'basic',
    options: [
      { label: '请选择', value: '' },
      { label: 'Qwen3.5', value: 'qwen3.5' },
      { label: 'Qwen3-VL', value: 'qwen3-vl' },
      { label: 'Qwen2.5-VL', value: 'qwen2.5-vl' },
      { label: 'Doubao-Seed', value: 'doubao-seed' },
      { label: 'GLM-V', value: 'glm-v' },
      { label: 'AutoGLM', value: 'auto-glm' },
      { label: 'Gemini', value: 'gemini' },
      { label: 'UI-TARS', value: 'vlm-ui-tars' },
    ],
  },
];

/**
 * 通用高级环境变量配置
 *
 * 包含模型调用的高级配置项：
 * - 超时时间：API 请求超时毫秒数
 * - 采样温度：模型生成文本的随机性控制
 * - 最大 Token 数：响应最大长度
 * - 重试配置：失败重试次数和间隔
 */
const COMMON_ADVANCED_VARS: ProviderConfig['envVars'] = [
  {
    key: 'MIDSCENE_MODEL_TIMEOUT',
    label: '超时时间',
    placeholder: '600000',
    type: 'number',
    category: 'advanced',
    default: '600000',
  },
  {
    key: 'MIDSCENE_MODEL_TEMPERATURE',
    label: '采样温度',
    placeholder: '0.7',
    type: 'number',
    category: 'advanced',
    default: '0.7',
  },
  {
    key: 'MIDSCENE_MODEL_MAX_TOKENS',
    label: '最大 Token 数',
    placeholder: '2048',
    type: 'number',
    category: 'advanced',
    default: '2048',
  },
  {
    key: 'MIDSCENE_MODEL_RETRY_COUNT',
    label: '重试次数',
    placeholder: '1',
    type: 'number',
    category: 'advanced',
    default: '1',
  },
  {
    key: 'MIDSCENE_MODEL_RETRY_INTERVAL',
    label: '重试间隔 (ms)',
    placeholder: '2000',
    type: 'number',
    category: 'advanced',
    default: '2000',
  },
];

/**
 * 通用推理模式环境变量配置
 *
 * 包含模型推理/思考相关的配置项：
 * - 推理模式开关：启用或关闭模型思考功能
 * - 推理力度：控制推理深度（低/中/高）
 * - 思考 Token 预算：限制思考过程消耗的 Token 数量
 */
const COMMON_REASONING_VARS: ProviderConfig['envVars'] = [
  {
    key: 'MIDSCENE_MODEL_REASONING_ENABLED',
    label: '推理模式',
    type: 'select',
    category: 'reasoning',
    options: [
      { label: '不设置', value: '' },
      { label: '关闭', value: 'false' },
      { label: '开启', value: 'true' },
    ],
  },
  {
    key: 'MIDSCENE_MODEL_REASONING_EFFORT',
    label: '推理力度',
    type: 'select',
    category: 'reasoning',
    options: [
      { label: '不设置', value: '' },
      { label: '低', value: 'low' },
      { label: '中', value: 'medium' },
      { label: '高', value: 'high' },
    ],
  },
  {
    key: 'MIDSCENE_MODEL_REASONING_BUDGET',
    label: '思考 Token 预算',
    placeholder: '1024',
    type: 'number',
    category: 'reasoning',
  },
];

/**
 * 通用网络环境变量配置
 *
 * 包含网络代理相关的配置项：
 * - HTTP 代理：HTTP/HTTPS 代理服务器地址
 * - SOCKS 代理：SOCKS5 代理服务器地址
 */
const COMMON_NETWORK_VARS: ProviderConfig['envVars'] = [
  {
    key: 'MIDSCENE_MODEL_HTTP_PROXY',
    label: 'HTTP 代理',
    placeholder: 'http://127.0.0.1:8080',
    type: 'text',
    category: 'network',
  },
  {
    key: 'MIDSCENE_MODEL_SOCKS_PROXY',
    label: 'SOCKS 代理',
    placeholder: 'socks5://127.0.0.1:1080',
    type: 'text',
    category: 'network',
  },
];

/**
 * 通用调试环境变量配置
 *
 * 包含调试日志相关的配置项，用于控制日志输出级别：
 * - AI 调用详情：打印 AI 请求和响应的详细信息
 * - Token 消耗统计：打印 AI 服务消耗的时间和 Token 使用情况
 * - Token 消耗详情：打印 Token 消耗的详细信息
 * - 所有日志：打印所有调试日志
 */
const COMMON_DEBUG_VARS: ProviderConfig['envVars'] = [
  {
    key: 'DEBUG',
    label: '调试日志',
    type: 'select',
    category: 'debug',
    options: [
      { label: '不设置', value: '' },
      { label: 'AI 调用详情', value: 'midscene:ai:call' },
      { label: 'Token 消耗统计', value: 'midscene:ai:profile:stats' },
      { label: 'Token 消耗详情', value: 'midscene:ai:profile:detail' },
      { label: '所有日志', value: 'midscene:*' },
    ],
  },
];

/**
 * Insight 专用模型环境变量配置
 *
 * 为 Insight 意图（图像理解、元素定位等）单独配置模型参数。
 * 当 Insight 任务需要不同于主模型的配置时使用。
 *
 * 配置项包括：
 * - API 密钥、Base URL、模型名称
 * - 超时时间、采样温度
 */
const INSIGHT_MODEL_VARS: ProviderConfig['envVars'] = [
  {
    key: 'MIDSCENE_INSIGHT_MODEL_API_KEY',
    label: 'Insight API 密钥',
    type: 'password',
    category: 'basic',
  },
  {
    key: 'MIDSCENE_INSIGHT_MODEL_BASE_URL',
    label: 'Insight Base URL',
    category: 'basic',
  },
  {
    key: 'MIDSCENE_INSIGHT_MODEL_NAME',
    label: 'Insight 模型名称',
    category: 'basic',
  },
  {
    key: 'MIDSCENE_INSIGHT_MODEL_TIMEOUT',
    label: 'Insight 超时时间',
    type: 'number',
    category: 'advanced',
  },
  {
    key: 'MIDSCENE_INSIGHT_MODEL_TEMPERATURE',
    label: 'Insight 采样温度',
    type: 'number',
    category: 'advanced',
  },
];

/**
 * Planning 专用模型环境变量配置
 *
 * 为 Planning 意图（任务规划、步骤分解等）单独配置模型参数。
 * 当 Planning 任务需要不同于主模型的配置时使用。
 *
 * 配置项包括：
 * - API 密钥、Base URL、模型名称
 * - 超时时间、采样温度
 */
const PLANNING_MODEL_VARS: ProviderConfig['envVars'] = [
  {
    key: 'MIDSCENE_PLANNING_MODEL_API_KEY',
    label: 'Planning API 密钥',
    type: 'password',
    category: 'basic',
  },
  {
    key: 'MIDSCENE_PLANNING_MODEL_BASE_URL',
    label: 'Planning Base URL',
    category: 'basic',
  },
  {
    key: 'MIDSCENE_PLANNING_MODEL_NAME',
    label: 'Planning 模型名称',
    category: 'basic',
  },
  {
    key: 'MIDSCENE_PLANNING_MODEL_TIMEOUT',
    label: 'Planning 超时时间',
    type: 'number',
    category: 'advanced',
  },
  {
    key: 'MIDSCENE_PLANNING_MODEL_TEMPERATURE',
    label: 'Planning 采样温度',
    type: 'number',
    category: 'advanced',
  },
];

/**
 * 模型服务提供商配置列表
 *
 * 定义了所有支持的模型服务商及其配置模板：
 * - qwen3.5: 阿里云千问 Qwen3.5（推荐关闭思考模式）
 * - qwen3-vl: 阿里云千问 Qwen3-VL 视觉语言模型
 * - qwen2.5-vl: 阿里云千问 Qwen2.5-VL 视觉语言模型
 * - doubao-seed: 火山引擎豆包 Seed 模型
 * - glm-v: 智谱 AI GLM-V 开源视觉模型
 * - auto-glm: 智谱 AI AutoGLM 移动端 UI 自动化模型
 * - gemini: Google Gemini 模型
 * - ui-tars: 火山引擎 UI-TARS UI 自动化模型
 * - custom: 自定义配置模式
 *
 * 每个服务商配置都包含：
 * - 基础配置（API Key、Base URL、模型名称、模型系列）
 * - 推理模式配置（如适用）
 * - 高级配置（超时、温度、重试、代理等）
 * - 调试日志配置
 */
const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    id: 'qwen3.5',
    name: '阿里云 - 千问 Qwen3.5',
    description: '推荐关闭思考模式以提升执行速度',
    envVars: [
      ...COMMON_BASIC_VARS.map((v) => {
        if (v.key === 'MIDSCENE_MODEL_NAME') {
          return { ...v, placeholder: 'qwen3.5-plus' };
        }
        if (v.key === 'MIDSCENE_MODEL_FAMILY') {
          return { ...v, default: 'qwen3.5' };
        }
        return v;
      }),
      ...COMMON_REASONING_VARS.map((v) => {
        if (v.key === 'MIDSCENE_MODEL_REASONING_ENABLED') {
          return { ...v, default: 'false' };
        }
        return v;
      }),
      ...COMMON_ADVANCED_VARS,
      ...COMMON_NETWORK_VARS,
      ...COMMON_DEBUG_VARS,
    ],
  },
  {
    id: 'qwen3-vl',
    name: '阿里云 - 千问 Qwen3-VL',
    description: '视觉语言模型',
    envVars: [
      ...COMMON_BASIC_VARS.map((v) => {
        if (v.key === 'MIDSCENE_MODEL_NAME') {
          return { ...v, placeholder: 'qwen3-vl-plus' };
        }
        if (v.key === 'MIDSCENE_MODEL_FAMILY') {
          return { ...v, default: 'qwen3-vl' };
        }
        return v;
      }),
      ...COMMON_REASONING_VARS,
      ...COMMON_ADVANCED_VARS,
      ...COMMON_NETWORK_VARS,
      ...COMMON_DEBUG_VARS,
    ],
  },
  {
    id: 'qwen2.5-vl',
    name: '阿里云 - 千问 Qwen2.5-VL',
    description: '视觉语言模型',
    envVars: [
      ...COMMON_BASIC_VARS.map((v) => {
        if (v.key === 'MIDSCENE_MODEL_NAME') {
          return { ...v, placeholder: 'qwen-vl-max-latest' };
        }
        if (v.key === 'MIDSCENE_MODEL_FAMILY') {
          return { ...v, default: 'qwen2.5-vl' };
        }
        return v;
      }),
      ...COMMON_REASONING_VARS,
      ...COMMON_ADVANCED_VARS,
      ...COMMON_NETWORK_VARS,
      ...COMMON_DEBUG_VARS,
    ],
  },
  {
    id: 'doubao-seed',
    name: '火山引擎 - 豆包 Seed 模型',
    description: '推荐 Doubao-Seed-2.0-Lite',
    envVars: [
      ...COMMON_BASIC_VARS.map((v) => {
        if (v.key === 'MIDSCENE_MODEL_BASE_URL') {
          return {
            ...v,
            placeholder: 'https://ark.cn-beijing.volces.com/api/v3',
          };
        }
        if (v.key === 'MIDSCENE_MODEL_NAME') {
          return { ...v, placeholder: 'ep-...', label: '推理接入点 ID' };
        }
        if (v.key === 'MIDSCENE_MODEL_FAMILY') {
          return { ...v, default: 'doubao-seed' };
        }
        return v;
      }),
      ...COMMON_REASONING_VARS.map((v) => {
        if (v.key === 'MIDSCENE_MODEL_REASONING_EFFORT') {
          return { ...v, default: 'medium' };
        }
        return v;
      }),
      ...COMMON_ADVANCED_VARS,
      ...COMMON_NETWORK_VARS,
      ...COMMON_DEBUG_VARS,
    ],
  },
  {
    id: 'glm-v',
    name: '智谱 AI - GLM-V',
    description: '开源视觉模型',
    envVars: [
      ...COMMON_BASIC_VARS.map((v) => {
        if (v.key === 'MIDSCENE_MODEL_BASE_URL') {
          return { ...v, placeholder: 'https://open.bigmodel.cn/api/paas/v4' };
        }
        if (v.key === 'MIDSCENE_MODEL_NAME') {
          return { ...v, placeholder: 'glm-4.6v' };
        }
        if (v.key === 'MIDSCENE_MODEL_FAMILY') {
          return { ...v, default: 'glm-v' };
        }
        return v;
      }),
      ...COMMON_REASONING_VARS,
      ...COMMON_ADVANCED_VARS,
      ...COMMON_NETWORK_VARS,
      ...COMMON_DEBUG_VARS,
    ],
  },
  {
    id: 'auto-glm',
    name: '智谱 AI - AutoGLM',
    description: '移动端 UI 自动化模型 (9B)',
    envVars: [
      ...COMMON_BASIC_VARS.map((v) => {
        if (v.key === 'MIDSCENE_MODEL_BASE_URL') {
          return { ...v, placeholder: 'https://open.bigmodel.cn/api/paas/v4' };
        }
        if (v.key === 'MIDSCENE_MODEL_NAME') {
          return { ...v, placeholder: 'autoglm-phone' };
        }
        if (v.key === 'MIDSCENE_MODEL_FAMILY') {
          return { ...v, default: 'auto-glm' };
        }
        return v;
      }),
      ...COMMON_REASONING_VARS,
      ...COMMON_ADVANCED_VARS,
      ...COMMON_NETWORK_VARS,
      ...COMMON_DEBUG_VARS,
    ],
  },
  {
    id: 'gemini',
    name: 'Google - Gemini',
    description: 'Gemini-3-Pro / Gemini-3-Flash',
    envVars: [
      ...COMMON_BASIC_VARS.map((v) => {
        if (v.key === 'MIDSCENE_MODEL_BASE_URL') {
          return {
            ...v,
            placeholder:
              'https://generativelanguage.googleapis.com/v1beta/openai/',
          };
        }
        if (v.key === 'MIDSCENE_MODEL_NAME') {
          return { ...v, placeholder: 'gemini-3.0-pro' };
        }
        if (v.key === 'MIDSCENE_MODEL_FAMILY') {
          return { ...v, default: 'gemini' };
        }
        return v;
      }),
      ...COMMON_REASONING_VARS,
      ...COMMON_ADVANCED_VARS,
      ...COMMON_NETWORK_VARS,
      ...COMMON_DEBUG_VARS,
    ],
  },
  {
    id: 'ui-tars',
    name: '火山引擎 - UI-TARS',
    description: 'Doubao-1.5-UI-TARS',
    envVars: [
      ...COMMON_BASIC_VARS.map((v) => {
        if (v.key === 'MIDSCENE_MODEL_BASE_URL') {
          return {
            ...v,
            placeholder: 'https://ark.cn-beijing.volces.com/api/v3',
          };
        }
        if (v.key === 'MIDSCENE_MODEL_NAME') {
          return { ...v, placeholder: 'ep-2025...', label: '推理接入点 ID' };
        }
        if (v.key === 'MIDSCENE_MODEL_FAMILY') {
          return { ...v, default: 'vlm-ui-tars' };
        }
        return v;
      }),
      ...COMMON_ADVANCED_VARS,
      ...COMMON_NETWORK_VARS,
      ...COMMON_DEBUG_VARS,
    ],
  },
  {
    id: 'custom',
    name: '自定义配置',
    description: '手动添加所有环境变量',
    envVars: [],
  },
];

/**
 * 环境配置组件主函数
 *
 * 提供一个用户友好的界面来配置和管理 Midscene 的模型环境变量。
 * 支持选择预设的模型服务商配置，也支持自定义环境变量。
 *
 * @param props - 组件属性
 * @param props.showTooltipWhenEmpty - 是否在没有配置时显示提示气泡（默认：true）
 * @param props.showModelName - 是否显示当前配置的模型名称（默认：true）
 * @param props.tooltipPlacement - 提示气泡位置（默认：'bottom'）
 * @param props.mode - 显示模式：'icon' 图标模式 或 'text' 文本模式（默认：'icon'）
 *
 * @returns 环境配置组件
 */
export function EnvConfig({
  showTooltipWhenEmpty = true,
  showModelName = true,
  tooltipPlacement = 'bottom',
  mode = 'icon',
}: {
  showTooltipWhenEmpty?: boolean;
  showModelName?: boolean;
  tooltipPlacement?: 'bottom' | 'top';
  mode?: 'icon' | 'text';
}) {
  // 从全局状态中获取环境配置
  const { config, configString, loadConfig, syncFromStorage } = useEnvConfig();

  // 模态框显示状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  // 当前选择的模型服务商 ID
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  // 环境变量列表
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  // 是否显示高级配置
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  // 是否显示 Insight 专用模型配置
  const [showInsightConfig, setShowInsightConfig] = useState(false);
  // 是否显示 Planning 专用模型配置
  const [showPlanningConfig, setShowPlanningConfig] = useState(false);
  // 当前配置的模型名称
  const midsceneModelName = config.MIDSCENE_MODEL_NAME;
  // 组件 DOM 引用
  const componentRef = useRef<HTMLDivElement>(null);

  /**
   * 解析配置字符串为对象
   *
   * 将 .env 格式的配置字符串解析为键值对对象。
   * 支持格式：`KEY=value` 或 `export KEY=value;`
   * 自动去除值周围的引号（单引号或双引号）
   *
   * @param configString - 配置字符串，每行一个环境变量
   * @returns 解析后的配置对象
   */
  const parseConfig = (configString: string): Record<string, string> => {
    const lines = configString.split('\n');
    const config: Record<string, string> = {};
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) return;

      const cleanLine = trimmed
        .replace(/^export\s+/i, '')
        .replace(/;$/, '')
        .trim();
      const match = cleanLine.match(/^(\w+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        let parsedValue = value.trim();

        // Remove surrounding quotes if present
        if (
          (parsedValue.startsWith("'") && parsedValue.endsWith("'")) ||
          (parsedValue.startsWith('"') && parsedValue.endsWith('"'))
        ) {
          parsedValue = parsedValue.slice(1, -1);
        }

        config[key] = parsedValue;
      }
    });
    return config;
  };

  /**
   * 解析配置字符串为环境变量数组
   *
   * 将配置字符串解析为 EnvVar 对象数组，用于在 UI 中展示和编辑。
   * 跳过注释行（以 # 开头），支持 export 语法。
   *
   * @param configStr - 配置字符串
   * @returns 环境变量数组
   */
  const parseConfigToEnvVars = (configStr: string): EnvVar[] => {
    const lines = configStr.split('\n').filter((line) => line.trim());
    const vars: EnvVar[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) return;

      const cleanLine = trimmed
        .replace(/^export\s+/i, '')
        .replace(/;$/, '')
        .trim();
      const match = cleanLine.match(/^(\w+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        let parsedValue = value.trim();

        // Remove surrounding quotes if present
        if (
          (parsedValue.startsWith("'") && parsedValue.endsWith("'")) ||
          (parsedValue.startsWith('"') && parsedValue.endsWith('"'))
        ) {
          parsedValue = parsedValue.slice(1, -1);
        }

        vars.push({ key, value: parsedValue });
      }
    });

    return vars;
  };

  /**
   * 将环境变量数组转换为配置字符串
   *
   * 将 EnvVar 对象数组转换回 .env 格式的字符串，用于保存配置。
   * 格式为：`KEY=value`，每行一个变量。
   * 注意：会过滤掉值为空的变量，避免保存无效配置。
   * 特别注意：DEBUG 变量如果值为空字符串（选择"关闭"），也不会保存。
   *
   * @param vars - 环境变量数组
   * @returns 配置字符串
   */
  const envVarsToConfigString = (vars: EnvVar[]): string => {
    return vars
      .filter((v) => {
        // 过滤掉键名为空的变量
        if (!v.key || !v.key.trim()) return false;
        // 过滤掉值为空、null 或 undefined 的变量
        if (
          v.value == null ||
          v.value === undefined ||
          !v.value.toString().trim()
        )
          return false;
        return true;
      })
      .map((v) => `${v.key}=${v.value}`)
      .join('\n');
  };

  /**
   * 从现有配置中检测模型服务提供商
   *
   * 根据 Base URL、模型系列等信息自动识别当前配置属于哪个服务商。
   * 支持识别：阿里云千问、火山引擎豆包、智谱 AI、Google Gemini 等。
   *
   * @param vars - 环境变量数组
   * @returns 检测到的服务商 ID，未识别返回空字符串
   */
  const detectProviderFromConfig = (vars: EnvVar[]): string => {
    const baseUrl =
      vars.find((v) => v.key === 'MIDSCENE_MODEL_BASE_URL')?.value || '';
    const family =
      vars.find((v) => v.key === 'MIDSCENE_MODEL_FAMILY')?.value || '';
    const modelName =
      vars.find((v) => v.key === 'MIDSCENE_MODEL_NAME')?.value || '';

    if (baseUrl.includes('dashscope.aliyuncs.com')) {
      if (family === 'qwen3.5') return 'qwen3.5';
      if (family === 'qwen3-vl') return 'qwen3-vl';
      if (family === 'qwen2.5-vl') return 'qwen2.5-vl';
      return 'qwen3.5';
    }
    if (
      baseUrl.includes('volces.com') ||
      baseUrl.includes('ark.cn-beijing.volces.com')
    ) {
      if (family?.includes('ui-tars')) return 'ui-tars';
      if (family?.includes('doubao-seed') || family?.includes('doubao'))
        return 'doubao-seed';
      return 'doubao-seed';
    }
    if (baseUrl.includes('bigmodel.cn') || baseUrl.includes('z.ai')) {
      if (family?.includes('auto-glm')) return 'auto-glm';
      if (family?.includes('glm-v')) return 'glm-v';
      return 'glm-v';
    }
    if (baseUrl.includes('generativelanguage.googleapis.com')) {
      return 'gemini';
    }

    return '';
  };

  /**
   * 显示配置模态框
   *
   * 打开环境变量配置模态框，加载当前配置并自动检测服务商。
   * 同时检测是否包含高级配置、Insight 配置和 Planning 配置。
   *
   * @param e - 鼠标事件对象
   */
  const showModal = (e: React.MouseEvent) => {
    syncFromStorage();

    const parsed = parseConfigToEnvVars(configString);
    const detectedProvider = detectProviderFromConfig(parsed);

    // Detect if has insight/planning config
    const hasInsightConfig = parsed.some((v) =>
      v.key.startsWith('MIDSCENE_INSIGHT_MODEL_'),
    );
    const hasPlanningConfig = parsed.some((v) =>
      v.key.startsWith('MIDSCENE_PLANNING_MODEL_'),
    );
    const hasAdvancedConfig = parsed.some((v) => {
      const advancedKeys = [
        'MIDSCENE_MODEL_TIMEOUT',
        'MIDSCENE_MODEL_TEMPERATURE',
        'MIDSCENE_MODEL_MAX_TOKENS',
        'MIDSCENE_MODEL_RETRY_COUNT',
        'MIDSCENE_MODEL_RETRY_INTERVAL',
        'MIDSCENE_MODEL_HTTP_PROXY',
        'MIDSCENE_MODEL_SOCKS_PROXY',
      ];
      return advancedKeys.includes(v.key);
    });

    // If no provider detected, default to the first one
    const providerId =
      detectedProvider ||
      (PROVIDER_CONFIGS.length > 0 ? PROVIDER_CONFIGS[0].id : '');
    setSelectedProviderId(providerId);
    setShowAdvancedConfig(hasAdvancedConfig);
    setShowInsightConfig(hasInsightConfig);
    setShowPlanningConfig(hasPlanningConfig);

    if (providerId && providerId !== 'custom') {
      const providerConfig = PROVIDER_CONFIGS.find((p) => p.id === providerId);
      if (providerConfig) {
        const newVars: EnvVar[] = providerConfig.envVars.map((envVar) => {
          const existingVar = parsed.find((v) => v.key === envVar.key);

          // 【修改点1】移除了下拉框默认选中第一个选项的逻辑，保持值为空
          const value = existingVar?.value || '';

          return {
            key: envVar.key,
            value,
            label: envVar.label,
            isPreset: true,
          };
        });

        const customVars = parsed.filter(
          (v) => !providerConfig.envVars.find((ev) => ev.key === v.key),
        );

        newVars.push(...customVars);
        setEnvVars(newVars);
      } else {
        setEnvVars(parsed);
      }
    } else {
      setEnvVars(parsed);
    }

    setIsModalOpen(true);
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * 处理保存确认
   *
   * 验证必填字段并将配置保存到全局状态。
   * 如果存在未填写的必填字段，显示错误提示。
   */
  const handleOk = () => {
    // 验证必填字段
    const missingRequiredFields = envVars.filter((envVar) => {
      if (!envVar.isPreset) return false; // Only validate preset fields

      const providerConfig = PROVIDER_CONFIGS.find((p) =>
        p.envVars.some((ev) => ev.key === envVar.key && ev.required),
      );

      if (!providerConfig) return false;

      const providerEnvVar = providerConfig.envVars.find(
        (ev) => ev.key === envVar.key && ev.required,
      );

      return providerEnvVar && !envVar.value.trim();
    });

    if (missingRequiredFields.length > 0) {
      Modal.error({
        title: '配置不完整',
        content: (
          <div>
            <p>以下必填字段未填写：</p>
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              {missingRequiredFields.map((field) => (
                <li key={field.key}>
                  {field.label || field.key} ({field.key})
                </li>
              ))}
            </ul>
          </div>
        ),
        okText: '确定',
      });
      return;
    }

    // Save configuration directly
    const configStr = envVarsToConfigString(envVars);
    loadConfig(configStr);
    setIsModalOpen(false);
    message.success('配置已成功保存');
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  /**
   * 处理服务商切换
   *
   * 当用户选择不同的模型服务商时，更新配置表单中的环境变量列表。
   * 保留已有的 Insight、Planning 和自定义变量配置。
   *
   * @param providerId - 选择的服务商 ID
   */
  const handleProviderChange = (providerId: string) => {
    setSelectedProviderId(providerId);

    const providerConfig = PROVIDER_CONFIGS.find((p) => p.id === providerId);
    if (!providerConfig) {
      return;
    }

    // Keep insight/planning config
    const currentInsightVars = envVars.filter((v) =>
      v.key.startsWith('MIDSCENE_INSIGHT_MODEL_'),
    );
    const currentPlanningVars = envVars.filter((v) =>
      v.key.startsWith('MIDSCENE_PLANNING_MODEL_'),
    );
    const currentCustomVars = envVars.filter((v) => !v.isPreset);

    const newVars: EnvVar[] = providerConfig.envVars.map((envVar) => {
      // 【修改点2】移除了下拉框默认选中第一个选项和读取default值的逻辑，强制默认值为空
      const defaultValue = '';

      return {
        key: envVar.key,
        value: defaultValue,
        label: envVar.label,
        isPreset: true,
      };
    });

    newVars.push(
      ...currentInsightVars,
      ...currentPlanningVars,
      ...currentCustomVars,
    );
    setEnvVars(newVars);
  };

  /**
   * 添加自定义环境变量
   *
   * 向环境变量列表中添加一个空的自定义变量项。
   */
  const handleAddVar = () => {
    const customVarsCount = envVars.filter((v) => !v.isPreset).length;
    setEnvVars([
      ...envVars,
      {
        key: '',
        value: '',
        label: `Custom ${customVarsCount + 1}`,
        isPreset: false,
      },
    ]);
  };

  /**
   * 添加 Insight 专用模型配置
   *
   * 向环境变量列表中添加 Insight 专用模型的所有配置项。
   * 自动过滤已存在的配置项，避免重复。
   */
  const handleAddInsightConfig = () => {
    const insightVars: EnvVar[] = INSIGHT_MODEL_VARS.map((v) => ({
      key: v.key,
      value: '',
      label: v.label,
      isPreset: true,
    }));

    // Filter out existing insight vars
    const existingInsightKeys = envVars
      .filter((v) => v.key.startsWith('MIDSCENE_INSIGHT_MODEL_'))
      .map((v) => v.key);
    const newVars = insightVars.filter(
      (v) => !existingInsightKeys.includes(v.key),
    );

    setEnvVars([...envVars, ...newVars]);
    setShowInsightConfig(true);
  };

  /**
   * 添加 Planning 专用模型配置
   *
   * 向环境变量列表中添加 Planning 专用模型的所有配置项。
   * 自动过滤已存在的配置项，避免重复。
   */
  const handleAddPlanningConfig = () => {
    const planningVars: EnvVar[] = PLANNING_MODEL_VARS.map((v) => ({
      key: v.key,
      value: '',
      label: v.label,
      isPreset: true,
    }));

    // Filter out existing planning vars
    const existingPlanningKeys = envVars
      .filter((v) => v.key.startsWith('MIDSCENE_PLANNING_MODEL_'))
      .map((v) => v.key);
    const newVars = planningVars.filter(
      (v) => !existingPlanningKeys.includes(v.key),
    );

    setEnvVars([...envVars, ...newVars]);
    setShowPlanningConfig(true);
  };

  const handleRemoveVar = (index: number) => {
    const newVars = envVars.filter((_, i) => i !== index);
    setEnvVars(newVars);
  };

  const handleVarChange = (
    index: number,
    field: 'key' | 'value' | 'customLabel' | 'isEditingLabel',
    value: any,
  ) => {
    const newVars = [...envVars];
    newVars[index] = { ...newVars[index], [field]: value };

    // Update display label when custom label changes
    if (field === 'customLabel' && !newVars[index].isPreset) {
      newVars[index].label = value || `Custom ${index + 1}`;
    }

    setEnvVars(newVars);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = Number.parseInt(e.dataTransfer.getData('text/plain'), 10);

    if (dragIndex === dropIndex) return;

    const newVars = [...envVars];
    const draggedVar = newVars[dragIndex];

    // Remove the dragged item
    newVars.splice(dragIndex, 1);

    // Insert at the new position
    newVars.splice(dropIndex, 0, draggedVar);

    setEnvVars(newVars);
  };

  const handleDragLabelStart = (e: React.DragEvent, index: number) => {
    // Only allow dragging from label area
    e.stopPropagation();
    handleDragStart(e, index);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        alignItems: 'center',
        height: '100%',
        minHeight: '32px',
      }}
      ref={componentRef}
    >
      {showModelName ? midsceneModelName : null}
      <Tooltip
        title="使用前请配置您的环境变量。"
        placement={tooltipPlacement}
        align={{ offset: [-10, 5] }}
        getPopupContainer={() => componentRef.current as HTMLElement}
        open={
          // undefined for default behavior of tooltip, hover for show
          // close tooltip when modal is open
          isModalOpen
            ? false
            : showTooltipWhenEmpty
              ? Object.keys(config).length === 0
              : undefined
        }
      >
        {mode === 'icon' ? (
          <SettingOutlined onClick={showModal} />
        ) : (
          <span
            onClick={showModal}
            style={{ color: '#006AFF', cursor: 'pointer' }}
          >
            set up
          </span>
        )}
      </Tooltip>
      <Modal
        title="模型环境配置"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="保存"
        cancelText="取消"
        width={800}
        styles={{
          body: {
            maxHeight: '70vh',
            overflowY: 'auto',
            overflowX: 'hidden',
          },
        }}
        destroyOnClose={true}
        maskClosable={true}
        centered={true}
        footer={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Button key="add" onClick={handleAddVar} icon={<PlusOutlined />}>
              添加自定义变量
            </Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button key="cancel" onClick={handleCancel}>
                取消
              </Button>
              <Button key="save" type="primary" onClick={handleOk}>
                保存
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px 0', color: '#666' }}>
            配置您的环境变量。这些数据将保存在<strong>您的浏览器本地</strong>。
          </p>
        </div>

        <Form layout="vertical">
          <Form.Item label="选择服务提供商">
            <Select
              value={selectedProviderId || undefined}
              onChange={handleProviderChange}
              style={{ width: '100%' }}
              placeholder="请选择模型服务提供商"
              size="large"
              optionLabelProp="label"
            >
              {PROVIDER_CONFIGS.map((provider) => (
                <Select.Option
                  key={provider.id}
                  value={provider.id}
                  label={provider.name}
                  title={provider.description}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{provider.name}</div>
                    {provider.description && (
                      <div
                        style={{ fontSize: 12, color: '#999', marginTop: 2 }}
                      >
                        {provider.description}
                      </div>
                    )}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedProviderId && selectedProviderId !== 'custom' && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: 4,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
                已选择{' '}
                <strong>
                  {
                    PROVIDER_CONFIGS.find((p) => p.id === selectedProviderId)
                      ?.name
                  }
                </strong>
                ，请填写以下配置信息
              </p>
            </div>
          )}

          <div
            style={{
              marginBottom: 20,
              padding: '12px 16px',
              backgroundColor: '#f0f5ff',
              borderRadius: 6,
              border: '1px solid #d6e4ff',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 8,
                color: '#1d39c4',
              }}
            >
              📋 配置分类显示
            </div>
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Button
                size="small"
                type="default"
                onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                style={{
                  fontSize: 12,
                  borderColor: showAdvancedConfig ? '#1d39c4' : undefined,
                  borderWidth: showAdvancedConfig ? 2 : undefined,
                }}
              >
                {showAdvancedConfig ? '🕒 隐藏' : '📝 显示'} 高级配置
                <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 11 }}>
                  (超时、温度、重试、代理等)
                </span>
              </Button>
              <Button
                size="small"
                type="default"
                onClick={() => {
                  if (!showInsightConfig) {
                    handleAddInsightConfig();
                  } else {
                    setShowInsightConfig(false);
                  }
                }}
                style={{
                  fontSize: 12,
                  borderColor: showInsightConfig ? '#1d39c4' : undefined,
                  borderWidth: showInsightConfig ? 2 : undefined,
                }}
              >
                {showInsightConfig ? '🔍 隐藏' : '🔍 显示'} Insight 专用模型配置
              </Button>
              <Button
                size="small"
                type="default"
                onClick={() => {
                  if (!showPlanningConfig) {
                    handleAddPlanningConfig();
                  } else {
                    setShowPlanningConfig(false);
                  }
                }}
                style={{
                  fontSize: 12,
                  borderColor: showPlanningConfig ? '#1d39c4' : undefined,
                  borderWidth: showPlanningConfig ? 2 : undefined,
                }}
              >
                {showPlanningConfig ? '📅 隐藏' : '📅 显示'} Planning
                专用模型配置
              </Button>
            </div>
          </div>

          {envVars.map((envVar, index) => {
            // Filter logic for category display
            const isInsightVar = envVar.key.startsWith(
              'MIDSCENE_INSIGHT_MODEL_',
            );
            const isPlanningVar = envVar.key.startsWith(
              'MIDSCENE_PLANNING_MODEL_',
            );
            const isAdvancedVar = [
              'MIDSCENE_MODEL_TIMEOUT',
              'MIDSCENE_MODEL_TEMPERATURE',
              'MIDSCENE_MODEL_MAX_TOKENS',
              'MIDSCENE_MODEL_RETRY_COUNT',
              'MIDSCENE_MODEL_RETRY_INTERVAL',
              'MIDSCENE_MODEL_HTTP_PROXY',
              'MIDSCENE_MODEL_SOCKS_PROXY',
            ].includes(envVar.key);
            const isDebugVar = envVar.key === 'DEBUG';
            const isReasoningVar = envVar.key.startsWith(
              'MIDSCENE_MODEL_REASONING_',
            );
            const isBasicVar =
              !isInsightVar &&
              !isPlanningVar &&
              !isAdvancedVar &&
              !isDebugVar &&
              !isReasoningVar;

            // Skip if not in selected category
            if (isInsightVar && !showInsightConfig) return null;
            if (isPlanningVar && !showPlanningConfig) return null;
            if (isAdvancedVar && !showAdvancedConfig) return null;
            if (isDebugVar && !showAdvancedConfig) return null;
            if (isReasoningVar && !showAdvancedConfig) return null;

            const providerConfig =
              selectedProviderId && selectedProviderId !== 'custom'
                ? PROVIDER_CONFIGS.find((p) => p.id === selectedProviderId)
                : null;
            const providerEnvVar = providerConfig?.envVars.find(
              (ev) => ev.key === envVar.key,
            );
            const displayLabel =
              envVar.customLabel ||
              envVar.label ||
              providerEnvVar?.label ||
              `自定义 ${index + 1}`;
            const isCustomVar = !envVar.isPreset;
            const isEditingLabel = envVar.isEditingLabel === true;
            const inputType =
              providerEnvVar?.type ||
              (envVar.key.includes('KEY') ||
              envVar.key.includes('SECRET') ||
              envVar.key.includes('PASSWORD')
                ? 'password'
                : 'text');

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-end',
                  marginBottom: 12,
                  padding: '4px 0',
                }}
              >
                <div style={{ width: 160, flexShrink: 0 }}>
                  <Form.Item
                    label={
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {isCustomVar && isEditingLabel ? (
                          <Input
                            autoFocus
                            value={envVar.customLabel || `自定义 ${index + 1}`}
                            onChange={(e) =>
                              handleVarChange(
                                index,
                                'customLabel',
                                e.target.value,
                              )
                            }
                            onBlur={() =>
                              handleVarChange(index, 'isEditingLabel', false)
                            }
                            onPressEnter={() =>
                              handleVarChange(index, 'isEditingLabel', false)
                            }
                            style={{
                              flex: 1,
                              fontFamily: 'monospace',
                              fontSize: 12,
                              height: 24,
                              padding: '2px 7px',
                              minWidth: 80,
                            }}
                            size="small"
                            placeholder="标签"
                          />
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              cursor: isCustomVar ? 'grab' : 'default',
                              userSelect: 'none',
                            }}
                            draggable={isCustomVar}
                            onDragStart={(e) =>
                              isCustomVar && handleDragLabelStart(e, index)
                            }
                            onDragOver={(e) =>
                              isCustomVar && handleDragOver(e, index)
                            }
                            onDrop={(e) => isCustomVar && handleDrop(e, index)}
                            title={isCustomVar ? '拖动以调整顺序' : undefined}
                          >
                            <span>{displayLabel}</span>
                            {isCustomVar && (
                              <EditOutlined
                                onClick={() =>
                                  handleVarChange(index, 'isEditingLabel', true)
                                }
                                style={{
                                  fontSize: 12,
                                  color: '#999',
                                  cursor: 'pointer',
                                }}
                                title="编辑标签"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    }
                    style={{ marginBottom: 0 }}
                    required={providerEnvVar?.required || isCustomVar}
                  >
                    <Input
                      placeholder={providerEnvVar?.placeholder || '变量名'}
                      value={envVar.key}
                      onChange={(e) =>
                        handleVarChange(index, 'key', e.target.value)
                      }
                      style={{ fontFamily: 'monospace', fontSize: 13 }}
                      disabled={envVar.isPreset}
                    />
                  </Form.Item>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Form.Item
                    label={isCustomVar || !providerEnvVar ? '值' : null}
                    style={{ marginBottom: 0 }}
                    required={providerEnvVar?.required || isCustomVar}
                  >
                    {inputType === 'select' && providerEnvVar?.options ? (
                      <Select
                        value={envVar.value || undefined}
                        onChange={(value) =>
                          handleVarChange(index, 'value', value)
                        }
                        style={{ width: '100%' }}
                        placeholder={providerEnvVar.placeholder || '请选择'}
                        optionLabelProp="label"
                      >
                        {providerEnvVar.options.map((option) => (
                          <Select.Option
                            key={option.value}
                            value={option.value}
                            label={option.label}
                          >
                            {option.label}
                          </Select.Option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        placeholder={providerEnvVar?.placeholder || '值'}
                        value={envVar.value}
                        onChange={(e) =>
                          handleVarChange(index, 'value', e.target.value)
                        }
                        type={inputType === 'password' ? 'password' : 'text'}
                        style={{ fontFamily: 'monospace', fontSize: 13 }}
                      />
                    )}
                  </Form.Item>
                </div>
                {envVar.isPreset ? (
                  <div style={{ width: 32 }} />
                ) : (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveVar(index)}
                    style={{ marginBottom: 0, alignSelf: 'flex-end' }}
                  />
                )}
              </div>
            );
          })}
        </Form>

        {envVars.length === 0 && (
          <div
            style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}
          >
            <p>未配置环境变量</p>
            <Button
              type="dashed"
              onClick={handleAddVar}
              icon={<PlusOutlined />}
            >
              添加环境变量
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
