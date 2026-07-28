window.HPM_DATA = (() => {
  const stages = [
    {
      id: 'opportunity', no: '01', icon: '💡', title: '创意与机会识别', phase: '发现',
      summary: '把模糊想法转化为可验证的问题、场景和机会假设。',
      required: ['产品机会卡'], prompts: ['opportunity-card'],
      learn: {
        why: '硬件投入高、周期长。立项前首先要证明问题值得解决，而不是先决定做什么功能。',
        roles: ['产品经理', '市场', '销售', '技术预研', '管理层'],
        inputs: ['创意描述', '用户痛点线索', '参考产品', '技术趋势', '渠道反馈'],
        outputs: ['产品机会卡', '问题陈述', '关键假设', '验证计划'],
        methods: ['Jobs to Be Done', '5W1H', '机会评分', '假设地图'],
        pitfalls: ['把老板想法当成用户需求', '没有说明替代方案', '在证据不足时直接下结论'],
        quiz: { question: '产品机会卡最重要的作用是什么？', options: ['确定最终技术方案', '把想法转成可验证假设', '冻结量产BOM'], answer: 1 }
      }
    },
    {
      id: 'market-user', no: '02', icon: '🔎', title: '市场与用户调研', phase: '发现',
      summary: '验证市场规模、细分用户、使用场景、购买因素和进入条件。',
      required: ['市场调研报告', '用户研究报告'], prompts: ['market-research', 'market-extract', 'user-research'],
      learn: {
        why: '市场数据回答“值不值得做”，用户研究回答“具体为谁、解决什么”。二者不能互相替代。',
        roles: ['产品经理', '市场研究', '用户研究', '渠道', '销售'],
        inputs: ['行业报告', '平台数据', '访谈记录', '用户评价', '售后数据'],
        outputs: ['市场调研报告', '用户画像', '场景地图', '需求证据清单'],
        methods: ['桌面研究', '访谈', '问卷', '评论挖掘', '市场细分'],
        pitfalls: ['混淆出货量和零售额', '用少量样本代表整个市场', '忽略渠道差异'],
        quiz: { question: '用户研究与市场研究的核心区别是什么？', options: ['前者看需求机制，后者看市场结构', '两者完全相同', '前者只看价格'], answer: 0 }
      }
    },
    {
      id: 'competition', no: '03', icon: '📊', title: '竞品与替代方案', phase: '发现',
      summary: '建立竞品档案、功能与规格矩阵，并识别差异化机会。',
      required: ['竞品分析报告', '竞品对比矩阵'], prompts: ['competitor-analysis'],
      learn: {
        why: '竞品分析不是抄功能，而是理解不同产品如何围绕用户、价格和渠道作取舍。',
        roles: ['产品经理', '市场', 'ID', '研发', '销售'],
        inputs: ['官网资料', '电商页面', '用户评价', '拆解资料', '价格记录'],
        outputs: ['竞品库', '功能矩阵', '规格矩阵', '差异化建议'],
        methods: ['竞争分组', '价值曲线', '功能覆盖矩阵', '评论主题分析'],
        pitfalls: ['未知信息当作不支持', '只比较参数不比较场景', '忽略间接替代方案'],
        quiz: { question: '竞品没有公开某项规格时应如何处理？', options: ['判定不支持', '标记信息未知', '填入行业平均值'], answer: 1 }
      }
    },
    {
      id: 'product-definition', no: '04', icon: '🎯', title: '产品定义与MRD', phase: '定义',
      summary: '明确目标用户、产品定位、价值主张、范围和成功指标。',
      required: ['MRD', '产品定义文档'], prompts: ['mrd-definition'],
      learn: {
        why: '产品定义把市场证据转化为项目边界，是后续需求、成本和技术取舍的共同基准。',
        roles: ['产品经理', '市场', '销售', '研发负责人', '管理层'],
        inputs: ['市场结论', '用户场景', '竞品矩阵', '商业目标'],
        outputs: ['MRD', '产品定位', '版本范围', '成功指标'],
        methods: ['价值主张画布', '产品定位陈述', 'MoSCoW', '北极星指标'],
        pitfalls: ['把功能列表当产品定位', '范围无限扩张', '成功指标不可衡量'],
        quiz: { question: '产品定义阶段最关键的边界是什么？', options: ['做什么与不做什么', 'PCB走线规则', '产线节拍'], answer: 0 }
      }
    },
    {
      id: 'business-case', no: '05', icon: '🧮', title: '产品立项与商业案例', phase: '定义',
      summary: '评估市场、技术、成本、资源、认证和供应链可行性。',
      required: ['产品立项书', '商业案例'], prompts: ['business-case'],
      learn: {
        why: '技术可行不等于商业可行。立项必须同时回答投入、回报、资源和风险。',
        roles: ['产品负责人', '项目经理', '研发', '采购', '财务', '管理层'],
        inputs: ['MRD', '成本目标', '销量假设', '技术预研', '认证要求'],
        outputs: ['立项书', '预算框架', '里程碑', 'Go/No-Go结论'],
        methods: ['商业案例', '敏感性分析', 'Stage-Gate', '风险评估'],
        pitfalls: ['销量和成本无依据', '忽略NRE与认证费用', '没有退出条件'],
        quiz: { question: '立项评审不应忽略哪类成本？', options: ['只有BOM', 'NRE、模具、认证和售后', '只看包装'], answer: 1 }
      }
    },
    {
      id: 'id-cmf', no: '06', icon: '✏️', title: 'ID、CMF与体验设计', phase: '设计',
      summary: '形成外观、人机、材料、工艺和内部堆叠约束。',
      required: ['ID设计任务书', 'CMF规范', '设计评审记录'], prompts: ['id-cmf-brief'],
      learn: {
        why: '智能硬件外观必须同时满足品牌、体验、堆叠、工艺、成本和量产稳定性。',
        roles: ['产品经理', 'ID', '结构', '硬件', '采购', '质量'],
        inputs: ['产品定位', '用户场景', '内部器件约束', '成本目标'],
        outputs: ['ID任务书', 'CMF规范', '方案评审记录'],
        methods: ['设计语言板', '人机尺寸分析', 'CMF样板', 'DFM评审'],
        pitfalls: ['先定外形后做堆叠', '材料工艺无法量产', '忽视维修与装配'],
        quiz: { question: 'ID评审为什么需要结构和采购参与？', options: ['只为增加人数', '验证堆叠、工艺与成本', '决定广告文案'], answer: 1 }
      }
    },
    {
      id: 'requirements', no: '07', icon: '📋', title: '需求定义与评审', phase: '设计',
      summary: '把产品目标转化为可执行、可验证、可追溯的需求。',
      required: ['PRD', '需求评审记录'], prompts: ['prd', 'requirements-review'],
      learn: {
        why: '需求是跨职能协作的合同。模糊需求会在开发、测试和量产阶段放大成本。',
        roles: ['产品经理', '项目经理', '研发', '测试', '质量', '供应链'],
        inputs: ['MRD', '场景流程', 'ID方案', '法规要求'],
        outputs: ['PRD', '需求基线', '评审问题清单'],
        methods: ['用户故事', '用例', '验收标准', '需求编号与追溯'],
        pitfalls: ['需求不可测试', '遗漏异常流程', '把实现方案写成用户需求'],
        quiz: { question: '一条合格需求应至少具备什么？', options: ['可验证的验收标准', '漂亮配图', '供应商名称'], answer: 0 }
      }
    },
    {
      id: 'system-spec', no: '08', icon: '🧩', title: '系统架构与技术规格', phase: '设计',
      summary: '将需求展开到硬件、结构、嵌入式、App、云端和接口规格。',
      required: ['产品技术规格书', '系统架构图', '接口控制表'], prompts: ['technical-spec'],
      learn: {
        why: '规格是需求与工程实现之间的桥梁，也是测试计划的直接输入。',
        roles: ['系统工程师', '硬件', '结构', '嵌入式', 'App', '云平台', '测试'],
        inputs: ['PRD', '器件约束', '法规要求', '技术预研'],
        outputs: ['技术规格书', '系统框图', '接口表', '规格追溯矩阵'],
        methods: ['系统分解', '接口定义', '预算分配', '规格验证方法'],
        pitfalls: ['规格没有关联需求', '性能指标无测试方法', '子系统接口不清晰'],
        quiz: { question: '技术规格必须与什么建立关系？', options: ['至少一项需求和验证方法', '品牌口号', '员工数量'], answer: 0 }
      }
    },
    {
      id: 'supply-cost', no: '09', icon: '🏭', title: '供应链、BOM与成本', phase: '开发',
      summary: '完成供应链拆解、供应商评估、BOM成本和风险管理。',
      required: ['供应链调研报告', '供应商评价', 'BOM成本分析'], prompts: ['supply-research', 'supplier-evaluation', 'bom-cost'],
      learn: {
        why: '器件生命周期、MOQ、交期、良率和供应商能力会直接决定项目能否量产。',
        roles: ['采购', '供应链', '研发', '质量', '产品', '项目经理'],
        inputs: ['技术规格', '预估BOM', '销量计划', '成本目标'],
        outputs: ['供应商池', '定点评价', '成本版本', '供应风险台账'],
        methods: ['RFI/RFQ', '供应商审核', 'ABC成本分析', '双供策略'],
        pitfalls: ['宣传资料当能力证明', '只比较价格', '忽略替代料和停产风险'],
        quiz: { question: '供应商定点最不应只看什么？', options: ['最低报价', '质量与交付', '技术能力'], answer: 0 }
      }
    },
    {
      id: 'development', no: '10', icon: '🛠️', title: '详细开发与项目管理', phase: '开发',
      summary: '组织跨职能开发、里程碑、风险、问题、变更和决策。',
      required: ['项目计划', '风险台账', '变更记录', '决策日志'], prompts: ['project-plan'],
      learn: {
        why: '项目管理不是更新时间表，而是控制范围、依赖、风险和决策。',
        roles: ['项目经理', '产品经理', '各研发负责人', '采购', '质量'],
        inputs: ['需求基线', '技术方案', '供应商计划', '资源计划'],
        outputs: ['WBS', '里程碑', '风险台账', '决策与变更记录'],
        methods: ['关键路径', 'RAID', '配置基线', '变更控制'],
        pitfalls: ['风险只记录不跟进', '版本基线不清晰', '临时决策没有留痕'],
        quiz: { question: '项目管理中的配置基线用于什么？', options: ['明确当前正式版本', '设计品牌Logo', '统计粉丝'], answer: 0 }
      }
    },
    {
      id: 'validation', no: '11', icon: '🧪', title: 'EVT / DVT / PVT验证', phase: '验证',
      summary: '完成工程、设计和生产验证，形成需求—规格—测试闭环。',
      required: ['测试计划', '需求追溯矩阵', '阶段验证报告'], prompts: ['test-plan', 'phase-validation'],
      learn: {
        why: '测试不是找几个问题，而是证明需求和规格是否满足并支持阶段放行。',
        roles: ['测试', '质量', '研发', '产品', '项目经理', '供应商'],
        inputs: ['PRD', '技术规格', '样机版本', '缺陷记录'],
        outputs: ['测试计划', '测试报告', '缺陷闭环', 'Gate放行建议'],
        methods: ['验证矩阵', '缺陷分级', '回归测试', '可靠性验证'],
        pitfalls: ['测试不关联需求', '只看通过率', '带阻塞缺陷进入下一阶段'],
        quiz: { question: 'DVT阶段重点证明什么？', options: ['设计满足需求与可靠性要求', '市场规模', '品牌名字'], answer: 0 }
      }
    },
    {
      id: 'npi', no: '12', icon: '⚙️', title: 'NPI与量产准备', phase: '量产',
      summary: '冻结版本、验证工艺、产能、良率、检验和追溯体系。',
      required: ['NPI检查表', '试产报告', '量产放行记录'], prompts: ['npi-readiness'],
      learn: {
        why: '样机能工作不代表能够稳定、低成本和可追溯地批量生产。',
        roles: ['NPI', '制造', '质量', '研发', '采购', '项目经理'],
        inputs: ['量产BOM', '设计文件', '测试程序', 'SOP', '工装夹具'],
        outputs: ['试产报告', '量产检查表', '良率与产能结论'],
        methods: ['PFMEA', '控制计划', '产线验证', '首件确认'],
        pitfalls: ['版本未冻结就试产', '测试工位覆盖不足', '没有量产追溯'],
        quiz: { question: 'PVT最重要的验证对象是什么？', options: ['量产流程与生产能力', '市场广告', '产品命名'], answer: 0 }
      }
    },
    {
      id: 'launch', no: '13', icon: '🚀', title: '产品上市准备', phase: '上市',
      summary: '完成认证、包装、渠道、销售、售后、库存和发布放行。',
      required: ['上市计划', '上市检查表', '销售培训资料'], prompts: ['launch-plan'],
      learn: {
        why: '产品做完不等于可以卖。上市需要产品、渠道、内容、库存和售后同时就绪。',
        roles: ['产品', '市场', '销售', '渠道', '售后', '供应链', '法规'],
        inputs: ['正式规格', '认证结果', '包装资料', '库存计划'],
        outputs: ['GTM计划', '上市检查表', '销售与售后资料'],
        methods: ['Launch Readiness', '渠道培训', 'FAQ', '风险演练'],
        pitfalls: ['认证未完成先销售', '参数口径不一致', '售后备件未准备'],
        quiz: { question: '上市放行必须同时确认什么？', options: ['产品、渠道、库存和售后准备度', '只有广告素材', '只有售价'], answer: 0 }
      }
    },
    {
      id: 'post-launch', no: '14', icon: '🔄', title: '上市复盘与迭代', phase: '复盘',
      summary: '分析销量、评价、退货、质量和项目偏差，形成下一代路线图。',
      required: ['上市复盘报告', '下一代需求池', '项目归档索引'], prompts: ['post-launch-review', 'archive-index'],
      learn: {
        why: '产品上市后才获得最真实的用户和质量证据，必须转化为下一代资产。',
        roles: ['产品', '市场', '销售', '售后', '质量', '供应链', '研发'],
        inputs: ['销量', '评价', '退货', '售后', '质量和成本数据'],
        outputs: ['复盘报告', '需求池', '经验教训', '项目交付包'],
        methods: ['目标偏差分析', '问题归因', '版本路线图', '知识沉淀'],
        pitfalls: ['只总结成功不分析失败', '用户反馈不进入需求池', '项目资料散落'],
        quiz: { question: '上市复盘最重要的最终输出之一是什么？', options: ['下一代需求与可复用经验', '删除全部旧资料', '停止收集售后数据'], answer: 0 }
      }
    }
  ];

  const prompts = [
    {
      id: 'opportunity-card', title: '产品机会卡', stageId: 'opportunity', category: '产品战略',
      objective: '将模糊创意转化为可验证的问题、场景、替代方案和机会假设。',
      inputs: ['产品创意描述', '目标用户线索', '使用场景', '参考产品', '技术与渠道线索'],
      sections: ['产品机会摘要', '用户问题陈述', '现有解决方案与替代方式', '用户需求假设', '市场机会假设', '产品价值假设', '技术与商业可行性假设', '初步产品构想', '优先验证问题', '主要风险', '下一阶段证据清单'],
      checks: ['所有未验证内容标记为假设', '不得直接判断市场成立', '明确不采取行动时用户如何处理问题']
    },
    {
      id: 'market-research', title: '市场调研执行报告', stageId: 'market-user', category: '外部调研',
      objective: '完成决策级市场研究，判断目标市场、细分用户、竞争结构、渠道和进入条件。',
      inputs: ['产品方向', '目标国家', '目标用户', '目标渠道', '决策目标', '重点研究问题'],
      sections: ['市场定义与品类边界', '市场规模、增速与数据口径', '市场细分', '用户与使用场景', '购买决策因素', '竞争格局', '价格带与渠道', '法规认证与隐私安全', '技术路线与供应链', '市场机会与进入壁垒', '进入建议', '证据清单与研究限制'],
      checks: ['关键数字必须注明来源和年份', '区分出货量、零售额和预测值', '不同机构数据冲突时解释口径']
    },
    {
      id: 'market-extract', title: '市场报告结构化提炼', stageId: 'market-user', category: '资料提炼',
      objective: '只基于上传报告提炼事实、结论、限制和可传递给MRD的输入。',
      inputs: ['市场调研报告', '行业报告', '渠道数据', '平台数据'],
      sections: ['管理层十大结论', '市场定义', '关键数据表', '用户与场景', '竞争结论', '产品机会', '数据限制与冲突', 'MRD输入', '待补充调研'],
      checks: ['注明来源文件和页码', '区分报告观点与AI归纳', '不使用外部知识补充事实']
    },
    {
      id: 'user-research', title: '用户研究与场景定义', stageId: 'market-user', category: '用户研究',
      objective: '把访谈、问卷、评论和售后材料转化为用户细分、任务、旅程和需求证据。',
      inputs: ['访谈记录', '问卷数据', '用户评价', '售后记录', '现场观察'],
      sections: ['研究方法与样本', '用户细分', '核心用户画像', 'Jobs to Be Done', '用户旅程', '痛点与障碍', '购买因素', '异常与售后场景', '需求证据', '研究局限', '验证计划'],
      checks: ['不得用少量样本代表总体', '画像必须能对应真实证据', '区分高频问题和严重问题']
    },
    {
      id: 'competitor-analysis', title: '竞品分析与对比矩阵', stageId: 'competition', category: '竞争情报',
      objective: '建立竞品档案和功能、规格、体验、价格、渠道矩阵，识别差异化机会。',
      inputs: ['竞品官网', '电商页面', '规格书', '用户评价', '拆解与评测资料'],
      sections: ['竞争格局摘要', '竞品分组', '竞品档案', '功能覆盖矩阵', '关键规格矩阵', '价格与渠道', 'ID/CMF与交互体验', '用户评价主题', '质量与售后问题', '竞争空白', '差异化建议', '不建议跟随的功能'],
      checks: ['未知信息标记为信息未知', '区分直接竞品和替代方案', '差异化建议说明成本和风险']
    },
    {
      id: 'mrd-definition', title: 'MRD与产品定义', stageId: 'product-definition', category: '产品定义',
      objective: '把市场、用户和竞品证据转化为目标用户、产品定位、范围和成功指标。',
      inputs: ['市场摘要', '用户研究', '竞品矩阵', '商业目标', '价格与成本边界'],
      sections: ['文档信息', '市场机会', '目标用户', '核心场景', '用户问题', '产品定位陈述', '价值主张', '商业/用户/产品/质量目标', '首发范围', '后续范围', '明确不做', '核心能力', '目标价格与成本', '竞争基准', '成功指标', '主要风险', '待确认事项'],
      checks: ['产品定位不是功能列表', '范围必须包含不做什么', '成功指标可衡量且有时间边界']
    },
    {
      id: 'business-case', title: '产品立项书与商业案例', stageId: 'business-case', category: '立项决策',
      objective: '评估市场、技术、供应链、成本、资源、认证和回报，形成Go/No-Go建议。',
      inputs: ['MRD', '初步成本', '销量假设', '技术预研', '认证要求', '资源计划'],
      sections: ['项目摘要', '立项背景', '市场机会', '产品定位与范围', '核心竞争力', '商业模式', '价格、销量和收入假设', 'BOM与非BOM投入', '资源需求', '初步计划', '技术可行性', '供应链可行性', '法规可行性', '主要风险', '关键假设', 'Go/No-Go条件', '立项建议'],
      checks: ['不得虚构销量和成本', '缺失数据生成测算框架', '明确停止或重新评审条件']
    },
    {
      id: 'id-cmf-brief', title: 'ID与CMF设计任务书', stageId: 'id-cmf', category: '工业设计',
      objective: '形成品牌、形态、人机、堆叠、材料、工艺、成本和量产约束。',
      inputs: ['产品定位', '目标用户', '使用场景', '内部器件', '尺寸成本约束', '品牌资料'],
      sections: ['项目背景', '设计目标', '品牌与设计语言', '产品形态', '操作方式', '人机工程', '尺寸重量目标', '内部堆叠约束', '接口与传感器位置', '安装维护', '材料与表面处理', '颜色纹理触感', '环境防护', 'DFM与装配', '成本约束', '包装运输约束', '设计输出物', '评审标准', '待确认事项'],
      checks: ['区分设计目标与硬约束', '未完成堆叠时尺寸标记为目标值', '考虑维修、装配和量产一致性']
    },
    {
      id: 'prd', title: '智能硬件PRD', stageId: 'requirements', category: '需求管理',
      objective: '生成可执行、可验证、可追溯的设备、App、云端和服务需求。',
      inputs: ['MRD', '用户旅程', 'ID方案', '法规要求', '版本范围'],
      sections: ['文档信息与版本', '产品概述', '目标用户与场景', '产品范围', '设备/App/云端架构', '功能需求', '异常流程', '性能需求', '硬件需求', '结构与ID需求', '嵌入式需求', 'App需求', '云平台需求', '数据隐私与网络安全', '可靠性与法规', '包装配件', '安装维修售后', '数据指标', '版本规划', '明确不做', '需求追溯表'],
      checks: ['每条需求有唯一编号', '包含前置条件、异常流程和验收标准', '不预设不必要的技术实现']
    },
    {
      id: 'requirements-review', title: '跨职能需求评审', stageId: 'requirements', category: '评审',
      objective: '模拟跨职能团队审核PRD的完整性、可测试性、成本和风险。',
      inputs: ['PRD', 'MRD', 'ID方案', '法规清单', '目标成本'],
      sections: ['评审结论', '阻塞问题', '严重问题', '一般问题', '缺失场景', '冲突需求', '不可测试需求', '成本敏感需求', '供应链风险需求', '安全隐私风险', '建议删除或延期内容', '修改示例', 'Gate建议'],
      checks: ['从产品、项目、ID、结构、硬件、软件、测试、质量、供应链、市场、售后和法规角色审查', '重点检查断网、断电、低电量、升级失败和异常恢复']
    },
    {
      id: 'technical-spec', title: '系统架构与技术规格书', stageId: 'system-spec', category: '系统工程',
      objective: '把确认需求分解为子系统、接口、性能和验证规格。',
      inputs: ['PRD', '技术预研', '器件约束', '法规要求', 'ID与结构输入'],
      sections: ['系统总体架构', '子系统划分', '硬件规格', '结构规格', '嵌入式规格', 'App与云端规格', '通信与协议', '性能规格', '功耗续航', '环境可靠性', '安全隐私与网络安全', '法规认证', '包装运输', '接口控制表', '关键器件选型条件', '需求—规格矩阵', '规格验证方式', '待技术确认项'],
      checks: ['每项规格关联需求和验证方法', '不确定数值不得擅自填写', '明确接口所有者、方向、格式和异常处理']
    },
    {
      id: 'supply-research', title: '供应链调研执行方案', stageId: 'supply-cost', category: '供应链',
      objective: '拆解整机与核心器件供应链，形成供应商搜集、筛选、验证和双供策略。',
      inputs: ['产品规格', '预估BOM', '预计销量', '目标成本', '量产时间'],
      sections: ['供应链拆解', '供应商类型与能力要求', '搜集渠道', 'RFI信息表', '初筛标准', '技术评价', '质量评价', '商务评价', '交付评价', '风险评价', '样品与试产方案', '双供与替代料策略', '调研输出模板'],
      checks: ['区分供应商自述、第三方信息、样品、审厂和量产验证', '识别单一供应、长交期和停产风险']
    },
    {
      id: 'supplier-evaluation', title: '供应商综合评价与定点', stageId: 'supply-cost', category: '供应商管理',
      objective: '基于报价、样品、审核和项目配合信息形成主选、备选或淘汰建议。',
      inputs: ['供应商档案', '报价单', '样品报告', '会议纪要', '审厂报告'],
      sections: ['供应商基本信息', '资料完整度', '技术能力', '研发配合', '质量体系', '设备产能', '样品表现', '报价与MOQ', '交期', '认证', '客户经验', '交付与沟通', '经营风险', '知识产权与模具归属', '单一供应风险', '综合评分', '定点建议', '前置条件', '后续审核计划'],
      checks: ['信息不足标记为尚未验证', '不得因缺失信息默认打分', '关键能力必须说明验证证据']
    },
    {
      id: 'bom-cost', title: 'BOM与完整成本分析', stageId: 'supply-cost', category: '成本管理',
      objective: '分析BOM、模具、NRE、认证、物流、渠道和售后成本，识别成本偏差。',
      inputs: ['BOM', '供应商报价', '目标成本', '销量计划', '非BOM费用'],
      sections: ['成本版本', 'BOM汇总', '电子/结构/模组/电池/包装分类', '非BOM成本', '目标成本对比', '成本偏差', '高成本物料', '成本敏感项', '降本方案', '毛利测算框架', '成本风险', '待补充报价'],
      checks: ['不得虚构报价', '降本建议说明性能、质量和进度影响', '区分一次性投入与单台成本']
    },
    {
      id: 'project-plan', title: '项目计划、风险与配置基线', stageId: 'development', category: '项目管理',
      objective: '生成WBS、依赖、里程碑、关键路径、风险、变更和配置管理框架。',
      inputs: ['需求基线', '技术方案', '供应商计划', '目标上市时间', '资源计划'],
      sections: ['项目目标与范围', '阶段与里程碑', 'WBS', '任务输入输出', '责任角色', '依赖关系', '关键路径', '长周期任务', '供应商/模具/认证节点', 'EVT/DVT/PVT节点', '交付件清单', '风险台账', '变更流程', '决策日志', '配置基线'],
      checks: ['缺少日期时使用相对周期', '风险包括触发条件、预防与应急措施', '明确当前正式文档和版本']
    },
    {
      id: 'test-plan', title: '测试计划与追溯矩阵', stageId: 'validation', category: '测试验证',
      objective: '根据需求和规格生成完整验证范围、用例字段、通过标准和追溯矩阵。',
      inputs: ['PRD', '技术规格', '样机计划', '法规与可靠性要求'],
      sections: ['测试目标与范围', '不测试范围', '阶段与样机数量', '环境与设备', '功能测试', '性能测试', '功耗续航', '通信测试', '环境与机械可靠性', '寿命测试', '安全与EMC预测试', 'App与云端', '网络安全', '包装运输', '用户体验', '通过标准', '缺陷分级', '回归规则', '测试风险', '需求—规格—测试矩阵'],
      checks: ['每个用例关联需求和规格', '写明前置条件、步骤和期望结果', '关键安全和量产风险不得仅抽样描述']
    },
    {
      id: 'phase-validation', title: 'EVT/DVT/PVT阶段总结', stageId: 'validation', category: '阶段评审',
      objective: '提炼样机版本、测试结果、缺陷、整改和阶段放行条件。',
      inputs: ['测试报告', '缺陷清单', '样机版本', '试产记录', '会议纪要'],
      sections: ['阶段识别与目标', '配置版本', '测试范围与完成度', '关键通过结果', '严重与一般缺陷', '未关闭问题', '根因与整改', '回归状态', '需求覆盖', '规格满足度', '供应链与试产问题', '成本变化', '阶段风险', '下一阶段条件', 'Gate建议'],
      checks: ['不得只按通过率放行', '阻塞安全、认证、量产和核心体验的问题必须单列', '说明证据来源']
    },
    {
      id: 'npi-readiness', title: 'NPI与量产准备检查', stageId: 'npi', category: 'NPI',
      objective: '确认配置冻结、工艺、工装、测试、良率、产能、包装和追溯是否量产就绪。',
      inputs: ['量产BOM', '硬件结构软件版本', 'SOP', '试产报告', '质量资料'],
      sections: ['配置冻结', '量产BOM与替代料', '供应商与模具', '工装夹具', '生产工艺', 'SOP与检验标准', '产线测试', '关键质量控制点', '良率与产能', '包装物流', '认证', '追溯体系', '售后备件与维修', '试产问题', '量产风险', '放行条件'],
      checks: ['当前版本必须清晰', '未关闭试产问题标记责任人与关闭条件', '量产测试覆盖关键规格']
    },
    {
      id: 'launch-plan', title: '产品上市准备计划', stageId: 'launch', category: '商业化',
      objective: '组织产品、认证、渠道、内容、库存、培训和售后上市准备。',
      inputs: ['正式规格', '认证资料', '包装资料', '渠道计划', '库存与售后计划'],
      sections: ['上市目标与市场', '产品版本与命名', '定位与核心卖点', '规格口径', '包装与配件', '手册与安装', 'App与云服务', '认证标签', '图片视频与详情页', '销售渠道培训', 'FAQ与售后政策', '备件与维修', '库存物流', '上市风险', 'Readiness检查表', 'GTM放行建议'],
      checks: ['营销参数与正式规格一致', '认证和标签满足目标市场', '售后、备件和异常流程已准备']
    },
    {
      id: 'post-launch-review', title: '上市复盘与下一代规划', stageId: 'post-launch', category: '复盘',
      objective: '分析市场、用户、质量、成本和项目偏差，形成下一代需求池。',
      inputs: ['销量收入', '渠道数据', '用户评价', '退货售后', '质量成本', '项目记录'],
      sections: ['原始目标', '实际市场表现', '渠道表现', '激活与使用', '好评差评', '退货与售后', '故障与质量成本', '供应链表现', '成本毛利偏差', '进度偏差', '假设验证', '成功经验', '失败原因', '未解决问题', '下一代需求池', '优先级', '版本路线图', '知识沉淀'],
      checks: ['结论对应真实指标', '区分症状和根因', '下一代需求关联用户或质量证据']
    },
    {
      id: 'archive-index', title: '项目交付件归档索引', stageId: 'post-launch', category: '配置管理',
      objective: '生成正式交付件、版本基线、追溯完整度和项目经验的机器可读索引。',
      inputs: ['全部项目文档', '版本记录', '风险缺陷', '供应商与物料状态', '决策记录'],
      sections: ['项目基本信息', '阶段完成情况', '正式交付件清单', '当前配置基线', '需求追溯完整度', '风险关闭情况', '缺陷关闭情况', '关键决策', '供应商与物料状态', '缺失交付件', '项目经验', '归档建议', 'JSON索引'],
      checks: ['每个交付件标明正式版本与状态', '作废版本保留但不作为基线', '缺失文件不得自动视为完成']
    }
  ];

  const deliverableTypes = [...new Set(stages.flatMap(stage => stage.required))];

  const sampleProjects = [
    {
      id: 'project-smart-lock', name: '海外智能门锁', code: 'HPM-2026-001', category: '智能安防', owner: 'Simon',
      market: '美国 / 公寓与独立屋', channel: '跨境电商 + 分销商', targetPrice: 'US$149–199', targetCost: 'US$58',
      launchDate: '2027-03-31', priority: 'P0', status: '进行中', currentStage: 'requirements', health: '关注',
      stageStatus: { opportunity: 'done', 'market-user': 'done', competition: 'done', 'product-definition': 'done', 'business-case': 'done', 'id-cmf': 'review', requirements: 'active' }
    },
    {
      id: 'project-ai-recorder', name: 'AI随身录音器', code: 'HPM-2026-002', category: 'AI硬件', owner: 'Simon',
      market: '北美 / 商务会议', channel: '独立站 + 亚马逊', targetPrice: 'US$99–129', targetCost: 'US$32',
      launchDate: '2027-07-30', priority: 'P1', status: '探索中', currentStage: 'market-user', health: '正常',
      stageStatus: { opportunity: 'done', 'market-user': 'active' }
    }
  ];

  const sampleCompetitors = [
    { id: 'comp-1', projectId: 'project-smart-lock', brand: '示例品牌 A', product: 'Smart Lock Pro', price: 'US$179', market: '美国', channel: 'Amazon', positioning: '中高端家庭', strengths: '指纹、密码、远程授权', weaknesses: '安装复杂、App差评', source: '示例数据', confidence: '待验证' },
    { id: 'comp-2', projectId: 'project-smart-lock', brand: '示例品牌 B', product: 'Rental Lock', price: 'US$129', market: '美国', channel: '分销', positioning: '出租物业', strengths: '批量管理、价格低', weaknesses: '外观普通、功能较少', source: '示例数据', confidence: '待验证' }
  ];

  const sampleSuppliers = [
    { id: 'sup-1', projectId: 'project-smart-lock', name: '示例ODM A', type: '整机ODM', region: '深圳', technology: 4, quality: 3, cost: 4, delivery: 3, collaboration: 4, status: '初筛', risk: '需验证量产良率', evidence: '示例数据' },
    { id: 'sup-2', projectId: 'project-smart-lock', name: '示例模组 B', type: '通信模组', region: '上海', technology: 4, quality: 4, cost: 3, delivery: 4, collaboration: 3, status: '样品评估', risk: '单一供应', evidence: '示例数据' }
  ];

  const sampleTraceability = [
    { id: 'trace-1', projectId: 'project-smart-lock', requirementId: 'REQ-ENV-001', requirement: '产品应支持低温环境开锁', specId: 'SPEC-ENV-001', specification: '工作温度 -20℃～60℃', testId: 'TEST-ENV-001', test: '-20℃放置4小时后执行100次开锁', status: '待测试', defects: 0 },
    { id: 'trace-2', projectId: 'project-smart-lock', requirementId: 'REQ-PWR-001', requirement: '正常家庭使用续航不少于12个月', specId: 'SPEC-PWR-001', specification: '典型平均功耗≤0.35mW', testId: 'TEST-PWR-001', test: '典型场景功耗建模与30天实测', status: '设计中', defects: 0 }
  ];

  return { stages, prompts, deliverableTypes, sampleProjects, sampleCompetitors, sampleSuppliers, sampleTraceability };
})();
