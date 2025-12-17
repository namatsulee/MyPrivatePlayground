/**
 * Excel Service
 * 
 * 엑셀 파일에서 정책 데이터를 로드하고 파싱하는 서비스
 * - Question_Types: 문항 유형 사전
 * - Text_Features: 지문 속성 데이터
 * - Type_Requirements: 문항 유형별 출제 조건
 */

import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 엑셀 파일에서 모든 시트 데이터를 로드
 * @param {string} excelPath - 엑셀 파일 경로
 * @returns {Object} 파싱된 데이터
 */
export async function loadExcelData(excelPath) {
  const absolutePath = path.resolve(__dirname, '../../', excelPath);
  
  const workbook = XLSX.readFile(absolutePath);
  
  return {
    questionTypes: parseQuestionTypes(workbook),
    textFeatures: parseTextFeatures(workbook),
    typeRequirements: parseTypeRequirements(workbook),
    rawWorkbook: workbook
  };
}

/**
 * Question_Types 시트 파싱
 * 문항 유형 사전 - type_id, priority 등
 */
function parseQuestionTypes(workbook) {
  const sheetName = findSheetName(workbook, ['Question_Types', 'QuestionTypes', 'question_types']);
  if (!sheetName) {
    console.warn('⚠️ Question_Types 시트를 찾을 수 없습니다.');
    return getDefaultQuestionTypes();
  }
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    type_id: row.type_id || row.TYPE_ID || row.typeId,
    name: row.name || row.NAME || row.type_id,
    priority: parseInt(row.priority || row.PRIORITY || 99),
    category: row.category || row.CATEGORY || 'OTHER',
    description: row.description || row.DESCRIPTION || ''
  }));
}

/**
 * Text_Features 시트 파싱
 * 지문 속성 데이터
 */
function parseTextFeatures(workbook) {
  const sheetName = findSheetName(workbook, ['Text_Features', 'TextFeatures', 'text_features']);
  if (!sheetName) {
    console.warn('⚠️ Text_Features 시트를 찾을 수 없습니다.');
    return [];
  }
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    text_id: row.text_id || row.TEXT_ID || row.textId,
    explicit_facts: parseInt(row.explicit_facts || row.EXPLICIT_FACTS || 0),
    has_example: normalizeYesNo(row.has_example || row.HAS_EXAMPLE),
    has_conclusion: normalizeYesNo(row.has_conclusion || row.HAS_CONCLUSION),
    implicit_meaning: normalizeYesNo(row.implicit_meaning || row.IMPLICIT_MEANING),
    main_topic_count: parseInt(row.main_topic_count || row.MAIN_TOPIC_COUNT || 1),
    tone: (row.tone || row.TONE || 'factual').toLowerCase(),
    sentence_length: (row.sentence_length || row.SENTENCE_LENGTH || 'M').toUpperCase(),
    has_logical_connectors: normalizeYesNo(row.has_logical_connectors || row.HAS_LOGICAL_CONNECTORS),
    has_clear_progression: normalizeYesNo(row.has_clear_progression || row.HAS_CLEAR_PROGRESSION),
    passage: row.passage || row.PASSAGE || null // 지문 원문 (있을 경우)
  }));
}

/**
 * Type_Requirements 시트 파싱
 * 문항 유형별 출제 가능 최소 조건
 */
function parseTypeRequirements(workbook) {
  const sheetName = findSheetName(workbook, ['Type_Requirements', 'TypeRequirements', 'type_requirements']);
  if (!sheetName) {
    console.warn('⚠️ Type_Requirements 시트를 찾을 수 없습니다.');
    return getDefaultTypeRequirements();
  }
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map(row => ({
    type_id: row.type_id || row.TYPE_ID || row.typeId,
    feature: row.feature || row.FEATURE,
    operator: row.operator || row.OPERATOR || '=',
    value: row.value || row.VALUE
  }));
}

/**
 * 특정 지문 ID의 데이터 조회
 * @param {Object} excelData - 로드된 엑셀 데이터
 * @param {string} textId - 지문 ID
 * @returns {Object|null} 지문 데이터
 */
export function getTextFeatures(excelData, textId) {
  if (!excelData || !excelData.textFeatures) return null;
  return excelData.textFeatures.find(t => t.text_id === textId) || null;
}

/**
 * 모든 문항 유형 조회
 * @param {Object} excelData - 로드된 엑셀 데이터
 * @returns {Array} 문항 유형 목록
 */
export function getQuestionTypes(excelData) {
  if (!excelData || !excelData.questionTypes) return getDefaultQuestionTypes();
  return excelData.questionTypes;
}

/**
 * 특정 유형의 요구사항 조회
 * @param {Object} excelData - 로드된 엑셀 데이터
 * @param {string} typeId - 문항 유형 ID
 * @returns {Array} 요구사항 목록
 */
export function getTypeRequirements(excelData, typeId) {
  if (!excelData || !excelData.typeRequirements) return [];
  return excelData.typeRequirements.filter(r => r.type_id === typeId);
}

// ===== Helper Functions =====

/**
 * 시트 이름 찾기 (대소문자 무시)
 */
function findSheetName(workbook, possibleNames) {
  const sheetNames = workbook.SheetNames;
  for (const name of possibleNames) {
    const found = sheetNames.find(s => s.toLowerCase() === name.toLowerCase());
    if (found) return found;
  }
  return null;
}

/**
 * Y/N 값 정규화
 */
function normalizeYesNo(value) {
  if (!value) return false;
  const v = String(value).toLowerCase().trim();
  return v === 'y' || v === 'yes' || v === 'true' || v === '1';
}

/**
 * 기본 문항 유형 (엑셀에 없을 경우)
 */
function getDefaultQuestionTypes() {
  return [
    { type_id: 'R_MAIN', name: '주제/요지', priority: 1, category: 'MAIN', description: '글의 주제/제목/요지 파악' },
    { type_id: 'R_DETAIL', name: '세부정보', priority: 2, category: 'DETAIL', description: '내용 일치/불일치' },
    { type_id: 'R_DETAIL_SPECIFIC', name: '특정정보', priority: 3, category: 'DETAIL', description: '특정 정보 파악' },
    { type_id: 'R_INFER_REF', name: '지칭추론', priority: 4, category: 'INFER', description: '지칭 추론' },
    { type_id: 'R_INFER_SUMMARY', name: '요약문빈칸', priority: 5, category: 'INFER', description: '요약문 빈칸 추론' },
    { type_id: 'R_INFER_BLANK', name: '본문빈칸', priority: 6, category: 'INFER', description: '본문 빈칸 추론' },
    { type_id: 'R_INFER_MEANING', name: '의미추론', priority: 7, category: 'INFER', description: '함축 의미 추론' },
    { type_id: 'R_GRAMMAR_USAGE', name: '동일용법', priority: 8, category: 'GRAMMAR', description: '동일하게 쓰인 문장 고르기' },
    { type_id: 'R_GRAMMAR_ERROR', name: '어법오류', priority: 9, category: 'GRAMMAR', description: '어법상 틀린 것 고르기' },
    { type_id: 'R_VOCAB_SYN', name: '유의어', priority: 10, category: 'VOCAB', description: '유의어' },
    { type_id: 'R_VOCAB_ANT', name: '반의어', priority: 11, category: 'VOCAB', description: '반의어' },
    { type_id: 'R_VOCAB_DEF', name: '영영뜻풀이', priority: 12, category: 'VOCAB', description: '영영 뜻풀이' },
    { type_id: 'R_VOCAB_CONTEXT', name: '문맥상어휘', priority: 13, category: 'VOCAB', description: '문맥상 틀린 어휘 파악' },
    { type_id: 'R_FLOW_IRRELEVANT', name: '무관한문장', priority: 14, category: 'FLOW', description: '흐름과 무관한 문장' },
    { type_id: 'R_FLOW_SENTENCE', name: '문장순서', priority: 15, category: 'FLOW', description: '문장 순서 배열' },
    { type_id: 'R_FLOW_PARAGRAPH', name: '문단순서', priority: 16, category: 'FLOW', description: '문단 순서 배열' },
    { type_id: 'R_FLOW_INSERT', name: '문장위치', priority: 17, category: 'FLOW', description: '주어진 문장의 위치' }
  ];
}

/**
 * 기본 유형 요구사항 (엑셀에 없을 경우)
 */
function getDefaultTypeRequirements() {
  return [
    // R_MAIN: 주제 유형 - 특별한 조건 없음 (모든 지문에서 가능)
    { type_id: 'R_MAIN', feature: 'main_topic_count', operator: '>=', value: 1 },
    
    // R_DETAIL: 세부정보 - 명시적 사실이 2개 이상 필요
    { type_id: 'R_DETAIL', feature: 'explicit_facts', operator: '>=', value: 2 },
    
    // R_INFER_SUMMARY: 요약문 빈칸 - 결론이 있어야 함
    { type_id: 'R_INFER_SUMMARY', feature: 'has_conclusion', operator: '=', value: true },
    
    // R_INFER_MEANING: 의미추론 - 함축적 의미가 있어야 함
    { type_id: 'R_INFER_MEANING', feature: 'implicit_meaning', operator: '=', value: true },
    
    // R_FLOW_*: 논리 유형 - 논리적 연결어와 명확한 진행이 필요
    { type_id: 'R_FLOW_SENTENCE', feature: 'has_logical_connectors', operator: '=', value: true },
    { type_id: 'R_FLOW_SENTENCE', feature: 'has_clear_progression', operator: '=', value: true },
    { type_id: 'R_FLOW_PARAGRAPH', feature: 'has_logical_connectors', operator: '=', value: true },
    { type_id: 'R_FLOW_INSERT', feature: 'has_clear_progression', operator: '=', value: true }
  ];
}



