/**
 * Generate Route
 * 
 * 문항 생성 API 엔드포인트
 */

import { Router } from 'express';
import { getTextFeatures, getQuestionTypes } from '../services/excelService.js';
import { determineQuestionTypes } from '../services/eligibilityService.js';
import { generateQuestions } from '../services/questionService.js';
import { getAvailableTypes, getTypeDescriptions } from '../prompts/index.js';
import { loadPassage, listPassages, passageExists } from '../services/passageService.js';

const router = Router();

/**
 * POST /api/generate
 * 
 * 문항 생성 메인 엔드포인트
 * 
 * Request Body:
 * {
 *   "text_id": "T_M2_001",           // 지문 ID (필수 - 엑셀에서 조회)
 *   "passage": "...",                 // 지문 원문 (선택 - text_id로 못 찾을 경우 직접 제공)
 *   "text_features": { ... },         // 지문 속성 (선택 - 직접 제공 시)
 *   "force_types": ["R_MAIN", ...],   // 강제 지정 유형 (선택)
 *   "max_types": 5                    // 최대 생성 유형 수 (선택, 기본값 5)
 * }
 */
router.post('/generate', async (req, res) => {
  try {
    const { 
      text_id, 
      passage: providedPassage, 
      text_features: providedFeatures,
      force_types,
      max_types = 5 
    } = req.body;
    
    const excelData = req.excelData;
    
    // 1. 입력 검증
    if (!text_id && !providedPassage) {
      return res.status(400).json({
        error: 'text_id 또는 passage 중 하나는 필수입니다.'
      });
    }
    
    // 2. 지문 데이터 로드
    let textFeatures = null;
    let passage = providedPassage;
    
    if (text_id) {
      // 2-1. passages 폴더에서 지문 파일 로드
      const loadedPassage = loadPassage(text_id);
      if (loadedPassage) {
        passage = loadedPassage;
        console.log(`📖 지문 파일 로드 완료: ${text_id}`);
      }
      
      // 2-2. 엑셀에서 지문 속성 로드
      if (excelData) {
        textFeatures = getTextFeatures(excelData, text_id);
        if (textFeatures) {
          console.log(`📊 지문 속성 로드 완료: ${text_id}`);
        } else {
          console.log(`⚠️ 지문 ${text_id}의 속성을 엑셀에서 찾을 수 없습니다.`);
        }
      }
    }
    
    // 제공된 속성으로 오버라이드
    if (providedFeatures) {
      textFeatures = { ...textFeatures, ...providedFeatures };
    }
    
    // 지문 원문 필수 확인
    if (!passage) {
      return res.status(400).json({
        error: `지문을 찾을 수 없습니다. passages 폴더에 "${text_id}.txt" 파일이 있는지 확인하세요.`
      });
    }
    
    // 3. Final Type List 결정
    let finalTypes;
    
    if (force_types && Array.isArray(force_types) && force_types.length > 0) {
      // 강제 지정된 유형 사용
      console.log(`🔧 강제 지정 유형 사용: ${force_types.join(', ')}`);
      finalTypes = force_types;
    } else if (textFeatures && excelData) {
      // 엑셀 정책 기반 자동 결정
      console.log(`🔄 정책 기반 유형 결정 중...`);
      const result = determineQuestionTypes(excelData, textFeatures, { maxTypes: max_types });
      finalTypes = result.finalTypes;
      console.log(`📋 선정된 유형: ${finalTypes.join(', ')}`);
    } else {
      // 기본 유형 사용
      console.log(`📌 기본 유형 사용 (정책 데이터 없음)`);
      finalTypes = ['R_MAIN', 'R_DETAIL'];
    }
    
    // 4. 문항 생성
    console.log(`\n🚀 문항 생성 시작 (${finalTypes.length}개 유형)`);
    const generateResult = await generateQuestions(finalTypes, passage);
    
    // 5. 응답
    res.json({
      success: true,
      text_id: text_id || null,
      generated_types: finalTypes,
      questions: generateResult.questions,
      errors: generateResult.errors,
      summary: generateResult.summary
    });
    
  } catch (error) {
    console.error('❌ 문항 생성 오류:', error);
    res.status(500).json({
      error: '문항 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * POST /api/generate/single
 * 
 * 단일 유형 문항 생성
 */
router.post('/generate/single', async (req, res) => {
  try {
    const { type_id, passage } = req.body;
    
    if (!type_id || !passage) {
      return res.status(400).json({
        error: 'type_id와 passage는 필수입니다.'
      });
    }
    
    const availableTypes = getAvailableTypes();
    if (!availableTypes.includes(type_id)) {
      return res.status(400).json({
        error: `알 수 없는 문항 유형: ${type_id}`,
        available_types: availableTypes
      });
    }
    
    const result = await generateQuestions([type_id], passage);
    
    if (result.questions.length > 0) {
      res.json({
        success: true,
        question: result.questions[0]
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.errors[0]?.error || '문항 생성 실패'
      });
    }
    
  } catch (error) {
    console.error('❌ 단일 문항 생성 오류:', error);
    res.status(500).json({
      error: '문항 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

/**
 * GET /api/types
 * 
 * 사용 가능한 문항 유형 목록
 */
router.get('/types', (req, res) => {
  const excelData = req.excelData;
  
  // 엑셀에서 로드된 유형 + 프롬프트에서 정의된 유형 병합
  const excelTypes = excelData ? getQuestionTypes(excelData) : [];
  const promptTypes = getTypeDescriptions();
  
  const types = [];
  const typeIds = new Set();
  
  // 엑셀 유형 우선
  for (const type of excelTypes) {
    types.push({
      type_id: type.type_id,
      name: type.name,
      category: type.category,
      priority: type.priority,
      description: type.description,
      source: 'excel'
    });
    typeIds.add(type.type_id);
  }
  
  // 프롬프트에만 있는 유형 추가
  for (const [typeId, info] of Object.entries(promptTypes)) {
    if (!typeIds.has(typeId)) {
      types.push({
        type_id: typeId,
        name: info.name,
        category: info.category,
        priority: 99,
        description: info.description,
        source: 'prompt'
      });
    }
  }
  
  // priority 순 정렬
  types.sort((a, b) => a.priority - b.priority);
  
  res.json({
    count: types.length,
    types
  });
});

/**
 * GET /api/texts
 * 
 * 등록된 지문 목록 (passages 폴더 + 엑셀 데이터 병합)
 */
router.get('/texts', (req, res) => {
  const excelData = req.excelData;
  
  // passages 폴더의 파일 목록
  const passageFiles = listPassages();
  
  // 엑셀의 지문 속성
  const excelFeatures = excelData?.textFeatures || [];
  const excelMap = new Map(excelFeatures.map(t => [t.text_id, t]));
  
  // 병합: passages 폴더 기준
  const texts = passageFiles.map(p => {
    const excelInfo = excelMap.get(p.text_id);
    return {
      text_id: p.text_id,
      filename: p.filename,
      has_passage_file: true,
      has_excel_features: !!excelInfo,
      tone: excelInfo?.tone || null,
      sentence_length: excelInfo?.sentence_length || null,
      explicit_facts: excelInfo?.explicit_facts || null
    };
  });
  
  // 엑셀에만 있는 항목도 추가
  for (const t of excelFeatures) {
    if (!passageFiles.find(p => p.text_id === t.text_id)) {
      texts.push({
        text_id: t.text_id,
        filename: null,
        has_passage_file: false,
        has_excel_features: true,
        tone: t.tone,
        sentence_length: t.sentence_length,
        explicit_facts: t.explicit_facts
      });
    }
  }
  
  res.json({
    count: texts.length,
    passages_folder: 'reading-quiz-api/passages/',
    texts
  });
});

/**
 * POST /api/analyze
 * 
 * 지문 분석 - 어떤 문항 유형이 가능한지 확인
 */
router.post('/analyze', (req, res) => {
  try {
    const { text_id, text_features } = req.body;
    const excelData = req.excelData;
    
    let features = text_features;
    
    if (text_id && excelData) {
      const loadedFeatures = getTextFeatures(excelData, text_id);
      if (loadedFeatures) {
        features = { ...loadedFeatures, ...text_features };
      }
    }
    
    if (!features) {
      return res.status(400).json({
        error: 'text_id 또는 text_features가 필요합니다.'
      });
    }
    
    if (!excelData) {
      return res.status(400).json({
        error: '엑셀 데이터가 로드되지 않았습니다.'
      });
    }
    
    const result = determineQuestionTypes(excelData, features);
    
    res.json({
      text_id: text_id || null,
      input_features: features,
      eligibility: result.eligibility,
      final_types: result.finalTypes,
      type_details: result.typeDetails
    });
    
  } catch (error) {
    console.error('❌ 분석 오류:', error);
    res.status(500).json({
      error: '분석 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

export { router as generateRoute };


