/**
 * Eligibility Service
 * 
 * 지문 속성을 기반으로 출제 가능한 문항 유형을 계산하는 서비스
 * - 1차 필터: Eligibility 계산 (Type_Requirements 기준)
 * - 2차 필터: Final Type List 확정 (비즈니스 규칙 적용)
 */

import { getTypeRequirements, getQuestionTypes } from './excelService.js';

/**
 * 1차 필터: Eligibility 계산
 * Type_Requirements를 기준으로 각 type_id가 해당 지문에서 출제 가능한지 판단
 * 
 * @param {Object} excelData - 로드된 엑셀 데이터
 * @param {Object} textFeatures - 지문 속성 데이터
 * @returns {Object} { type_id: boolean } 형태의 eligibility 맵
 */
export function calculateEligibility(excelData, textFeatures) {
  const questionTypes = getQuestionTypes(excelData);
  const eligibility = {};
  
  for (const type of questionTypes) {
    const typeId = type.type_id;
    const requirements = getTypeRequirements(excelData, typeId);
    
    // 요구사항이 없으면 기본적으로 출제 가능
    if (requirements.length === 0) {
      eligibility[typeId] = true;
      continue;
    }
    
    // 모든 요구사항을 충족해야 출제 가능
    const isEligible = requirements.every(req => {
      return evaluateCondition(textFeatures, req.feature, req.operator, req.value);
    });
    
    eligibility[typeId] = isEligible;
  }
  
  return eligibility;
}

/**
 * 조건 평가
 * @param {Object} features - 지문 속성
 * @param {string} feature - 비교할 속성명
 * @param {string} operator - 연산자 (=, !=, >, <, >=, <=)
 * @param {*} value - 비교값
 * @returns {boolean}
 */
function evaluateCondition(features, feature, operator, value) {
  const featureValue = features[feature];
  
  // 속성이 없으면 조건 미충족
  if (featureValue === undefined || featureValue === null) {
    return false;
  }
  
  // 값 정규화
  const normalizedValue = normalizeValue(value);
  const normalizedFeature = normalizeValue(featureValue);
  
  switch (operator) {
    case '=':
    case '==':
      return normalizedFeature === normalizedValue;
    case '!=':
    case '<>':
      return normalizedFeature !== normalizedValue;
    case '>':
      return normalizedFeature > normalizedValue;
    case '<':
      return normalizedFeature < normalizedValue;
    case '>=':
      return normalizedFeature >= normalizedValue;
    case '<=':
      return normalizedFeature <= normalizedValue;
    case 'in':
      // value가 배열이거나 쉼표로 구분된 문자열
      const allowedValues = Array.isArray(normalizedValue) 
        ? normalizedValue 
        : String(normalizedValue).split(',').map(v => v.trim());
      return allowedValues.includes(String(normalizedFeature));
    case 'not_in':
      const disallowedValues = Array.isArray(normalizedValue) 
        ? normalizedValue 
        : String(normalizedValue).split(',').map(v => v.trim());
      return !disallowedValues.includes(String(normalizedFeature));
    default:
      console.warn(`알 수 없는 연산자: ${operator}`);
      return true; // 알 수 없는 연산자는 통과시킴
  }
}

/**
 * 값 정규화
 */
function normalizeValue(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value;
  
  const strValue = String(value).toLowerCase().trim();
  
  // 불리언 변환
  if (strValue === 'true' || strValue === 'y' || strValue === 'yes') return true;
  if (strValue === 'false' || strValue === 'n' || strValue === 'no') return false;
  
  // 숫자 변환
  const numValue = Number(value);
  if (!isNaN(numValue) && strValue !== '') return numValue;
  
  return strValue;
}

/**
 * 2차 필터: Final Type List 확정
 * Eligibility를 통과한 유형 중에서 비즈니스 규칙을 적용하여 최종 유형 결정
 * 
 * @param {Object} excelData - 로드된 엑셀 데이터
 * @param {Object} textFeatures - 지문 속성 데이터
 * @param {Object} eligibility - 1차 필터 결과
 * @param {Object} options - 추가 옵션 { maxTypes: number }
 * @returns {Array<string>} 최종 문항 유형 ID 배열
 */
export function decideFinalTypes(excelData, textFeatures, eligibility, options = {}) {
  const { maxTypes = 5 } = options;
  const questionTypes = getQuestionTypes(excelData);
  
  // 1. Eligibility를 통과한 유형만 필터링
  let eligibleTypes = questionTypes.filter(type => eligibility[type.type_id]);
  
  // 2. tone이 evaluative인 경우 특수 규칙 적용
  if (textFeatures.tone === 'evaluative') {
    // 모든 R_FLOW_* (논리 유형) 제외
    eligibleTypes = eligibleTypes.filter(type => !type.type_id.startsWith('R_FLOW_'));
    
    // inference 계열 (R_INFER_*)은 최대 1개만 허용
    const inferTypes = eligibleTypes.filter(type => type.type_id.startsWith('R_INFER_'));
    if (inferTypes.length > 1) {
      // priority가 가장 낮은(숫자가 작은) 것만 유지
      const bestInfer = inferTypes.sort((a, b) => a.priority - b.priority)[0];
      eligibleTypes = eligibleTypes.filter(type => 
        !type.type_id.startsWith('R_INFER_') || type.type_id === bestInfer.type_id
      );
    }
  }
  
  // 3. 기본 독해 유형은 항상 포함 시도
  const basicTypes = ['R_MAIN', 'R_DETAIL'];
  const finalTypeSet = new Set();
  
  // 기본 유형 먼저 추가
  for (const basicTypeId of basicTypes) {
    if (eligibility[basicTypeId]) {
      finalTypeSet.add(basicTypeId);
    }
  }
  
  // 4. priority 기준으로 정렬 후 나머지 추가
  const sortedTypes = eligibleTypes
    .filter(type => !finalTypeSet.has(type.type_id))
    .sort((a, b) => a.priority - b.priority);
  
  for (const type of sortedTypes) {
    if (finalTypeSet.size >= maxTypes) break;
    finalTypeSet.add(type.type_id);
  }
  
  // 5. priority 순으로 최종 정렬
  const result = Array.from(finalTypeSet);
  const typeMap = new Map(questionTypes.map(t => [t.type_id, t]));
  
  return result.sort((a, b) => {
    const typeA = typeMap.get(a);
    const typeB = typeMap.get(b);
    return (typeA?.priority || 99) - (typeB?.priority || 99);
  });
}

/**
 * 전체 필터링 프로세스 실행
 * calculateEligibility + decideFinalTypes 를 한 번에 수행
 * 
 * @param {Object} excelData - 로드된 엑셀 데이터
 * @param {Object} textFeatures - 지문 속성 데이터
 * @param {Object} options - 추가 옵션
 * @returns {Object} { eligibility, finalTypes, typeDetails }
 */
export function determineQuestionTypes(excelData, textFeatures, options = {}) {
  // 1차 필터
  const eligibility = calculateEligibility(excelData, textFeatures);
  
  // 2차 필터
  const finalTypes = decideFinalTypes(excelData, textFeatures, eligibility, options);
  
  // 유형 상세 정보 포함
  const questionTypes = getQuestionTypes(excelData);
  const typeMap = new Map(questionTypes.map(t => [t.type_id, t]));
  const typeDetails = finalTypes.map(typeId => typeMap.get(typeId) || { type_id: typeId });
  
  return {
    eligibility,
    finalTypes,
    typeDetails
  };
}



