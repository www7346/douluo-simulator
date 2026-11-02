type ProviderPreset = {
  label: string;
  url: string;
  protocol: 'auto' | 'compatible' | 'deepseek' | 'responses' | 'anthropic' | 'gemini';
  plan?: boolean;
  // Used only after the service reports that no model-list endpoint exists.
  publishedModels?: readonly string[];
};

export const OPEN_CODE_GO = 'https://opencode.ai/inference/go/v1';
export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {label:'OpenCode Go', plan:true, url:OPEN_CODE_GO, protocol:'auto'},
  {label:'Kimi Code（国内会员）', plan:true, url:'https://api.kimi.com/coding/v1', protocol:'compatible'},
  // https://cloud.tencent.com/document/product/1823/130060
  {label:'腾讯云 Token Plan', plan:true, url:'https://tokenhub.tencentmaas.com/plan/v3', protocol:'compatible',
   publishedModels:['tc-code-latest','deepseek/deepseek-flash','deepseek-v4-flash-202605','deepseek-v4-pro-202606','glm-5.3-flash','glm-5.3','glm-5.2','kimi-k3','kimi-k2.7-code','hy3','hy4-preview','minimax-m3','minimax-m2.7','mimo-v2.6-flash']},
  {label:'阿里云百炼 Token Plan', plan:true, url:'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1', protocol:'compatible'},
  {label:'阿里云百炼 Coding Plan', plan:true, url:'https://coding.dashscope.aliyuncs.com/v1', protocol:'compatible'},
  // https://cloud.baidu.com/doc/qianfan/s/Dmrabu8b6
  {label:'百度千帆 Token Plan 个人版', plan:true, url:'https://qianfan.baidubce.com/v2/tokenplan/personal', protocol:'compatible',
   publishedModels:['qianfan-code-latest','deepseek-v4.1-flash-1017','deepseek-v4.1-flash','deepseek-v4-pro','deepseek-v4-pro-0813','deepseek-v4-flash-0731','glm-5.3','glm-5.3-flash','glm-5.2','glm-5.1']},
  {label:'火山方舟 Agent Plan', plan:true, url:'https://ark.cn-beijing.volces.com/api/plan/v3', protocol:'compatible'},
  {label:'火山方舟 Coding Plan', plan:true, url:'https://ark.cn-beijing.volces.com/api/coding/v3', protocol:'compatible'},
  {label:'智谱 GLM Coding Plan', plan:true, url:'https://open.bigmodel.cn/api/coding/paas/v4', protocol:'compatible'},
  {label:'MiniMax 订阅（国内）', plan:true, url:'https://api.minimax.cn/v1', protocol:'compatible'},
  {label:'Poe 订阅积分', plan:true, url:'https://api.poe.com/v1', protocol:'compatible'},
  {label:'DeepSeek', url:'https://api.deepseek.com/v1', protocol:'deepseek'},
  {label:'豆包 / 火山方舟', url:'https://ark.cn-beijing.volces.com/api/v3', protocol:'compatible'},
  {label:'智谱 GLM', url:'https://open.bigmodel.cn/api/paas/v4', protocol:'compatible'},
  {label:'Kimi / Moonshot', url:'https://api.moonshot.cn/v1', protocol:'compatible'},
  {label:'Z.AI', url:'https://api.z.ai/api/paas/v4', protocol:'compatible'},
  {label:'OpenAI API', url:'https://api.openai.com/v1', protocol:'responses'},
  {label:'Claude', url:'https://api.anthropic.com/v1', protocol:'anthropic'},
  {label:'Gemini', url:'https://generativelanguage.googleapis.com/v1beta', protocol:'gemini'},
  {label:'Grok', url:'https://api.x.ai/v1', protocol:'responses'},
  {label:'OpenCode Zen', url:'https://opencode.ai/zen/v1', protocol:'compatible'},
];

export function providerForConnection(baseUrl: string) {
  const url = baseUrl.trim().replace(/\/+$/, '');
  return PROVIDER_PRESETS.find(provider => provider.url === url);
}

export function vertexProject(base: string) {
  const match = /^https:\/\/([a-z0-9-]+-)?aiplatform\.googleapis\.com\/v1\/projects\/([a-z0-9-]+)\/locations\/([a-z0-9-]+)\/endpoints\/openapi\/?$/.exec(base);
  if (!match || (match[1] ?? '') !== (match[3] === 'global' ? '' : match[3] + '-')) return;
  return { project: match[2], region: match[3] };
}
export const VERTEX_MODEL_CATALOG = '/v1beta1/publishers/google/models';
