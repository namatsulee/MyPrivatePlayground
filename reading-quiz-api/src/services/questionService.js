/**
 * Question Service
 * 
 * OpenAI API를 사용하여 문항을 생성하는 서비스
 * - 유형별 개별 API 호출 (한 호출 = 한 문항)
 * - 프롬프트 관리
 * - 응답 파싱 및 검증
 */

import OpenAI from 'openai';
import { getPromptForType } from '../prompts/index.js';

// OpenAI 클라이언트 초기화
let openaiClient = null;

/**
 * OpenAI 클라이언트 가져오기 (싱글톤)
 */
function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * 단일 문항 생성
 * 
 * @param {string} typeId - 문항 유형 ID
 * @param {string} passage - 지문 원문
 * @param {Object} options - 추가 옵션
 * @returns {Object} 생성된 문항 데이터
 */
export async function generateQuestionByType(typeId, passage, options = {}) {
  const { maxRetries = 2, model = 'gpt-4o-mini' } = options;
  
  const prompt = getPromptForType(typeId, passage);
  if (!prompt) {
    throw new Error(`알 수 없는 문항 유형: ${typeId}`);
  }
  
  const systemPrompt = `You are an expert English reading comprehension test question creator for Korean middle school students (Grade 8).
You must create questions that are appropriate for their level.
Always respond with valid JSON only, no additional text or markdown.
Follow the exact JSON structure specified in the prompt.`;

  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`   📝 ${typeId} 문항 생성 중... (시도 ${attempt + 1}/${maxRetries + 1})`);
      
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('API 응답이 비어있습니다.');
      }
      
      // JSON 파싱
      const questionData = parseQuestionResponse(content, typeId);
      
      // 필수 필드 검증
      validateQuestionData(questionData);
      
      console.log(`   ✅ ${typeId} 문항 생성 완료`);
      
      return {
        type_id: typeId,
        ...questionData
      };
      
    } catch (error) {
      lastError = error;
      console.error(`   ⚠️ ${typeId} 생성 실패 (시도 ${attempt + 1}): ${error.message}`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw new Error(`${typeId} 문항 생성 실패 (${maxRetries + 1}회 시도): ${lastError?.message}`);
}

/**
 * 여러 유형의 문항 생성
 * 
 * @param {Array<string>} typeIds - 문항 유형 ID 배열
 * @param {string} passage - 지문 원문
 * @param {Object} options - 추가 옵션
 * @returns {Array<Object>} 생성된 문항 배열
 */
export async function generateQuestions(typeIds, passage, options = {}) {
  const results = [];
  const errors = [];
  
  console.log(`\n🔄 총 ${typeIds.length}개 유형의 문항 생성 시작...`);
  
  for (const typeId of typeIds) {
    try {
      const question = await generateQuestionByType(typeId, passage, options);
      results.push(question);
    } catch (error) {
      console.error(`❌ ${typeId} 최종 실패: ${error.message}`);
      errors.push({ type_id: typeId, error: error.message });
    }
  }
  
  console.log(`\n📊 생성 결과: 성공 ${results.length}개, 실패 ${errors.length}개`);
  
  return {
    questions: results,
    errors,
    summary: {
      total: typeIds.length,
      success: results.length,
      failed: errors.length
    }
  };
}

/**
 * API 응답을 JSON으로 파싱
 */
function parseQuestionResponse(content, typeId) {
  // JSON 블록 추출 시도
  let jsonStr = content;
  
  // ```json ... ``` 형식 처리
  const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    jsonStr = jsonBlockMatch[1].trim();
  }
  
  // { ... } 형식만 추출
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }
  
  // 흔한 JSON 오류 수정
  jsonStr = jsonStr
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/'/g, '"')
    .replace(/[\x00-\x1F\x7F]/g, ' '); // 제어 문자 제거
  
  // answer 필드의 특수문자를 숫자로 변환
  jsonStr = jsonStr
    .replace(/"answer"\s*:\s*[ⓐ①]/g, '"answer": 1')
    .replace(/"answer"\s*:\s*[ⓑ②]/g, '"answer": 2')
    .replace(/"answer"\s*:\s*[ⓒ③]/g, '"answer": 3')
    .replace(/"answer"\s*:\s*[ⓓ④]/g, '"answer": 4')
    .replace(/"answer"\s*:\s*[ⓔ⑤]/g, '"answer": 5')
    .replace(/"answer"\s*:\s*"(\d)"/g, '"answer": $1');
  
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    // 불완전한 JSON 복구 시도
    console.log(`JSON 복구 시도 (${typeId})...`);
    const recovered = tryRecoverJSON(jsonStr);
    if (recovered) {
      console.log(`✅ JSON 복구 성공 (${typeId})`);
      return recovered;
    }
    
    console.error(`JSON 파싱 실패 (${typeId}):`, jsonStr.substring(0, 200));
    throw new Error(`JSON 파싱 실패: ${error.message}`);
  }
}

/**
 * 불완전한 JSON 복구 시도
 */
function tryRecoverJSON(jsonStr) {
  try {
    // 필수 필드 추출 시도 (이스케이프된 따옴표 포함)
    // question 필드 추출 - 더 넓은 범위로 매칭
    let question = '';
    const questionStart = jsonStr.indexOf('"question"');
    if (questionStart !== -1) {
      const colonPos = jsonStr.indexOf(':', questionStart);
      const firstQuote = jsonStr.indexOf('"', colonPos + 1);
      if (firstQuote !== -1) {
        // 다음 필드 시작 전까지 또는 끝 따옴표까지 추출
        let endPos = firstQuote + 1;
        let inEscape = false;
        while (endPos < jsonStr.length) {
          const char = jsonStr[endPos];
          if (inEscape) {
            inEscape = false;
          } else if (char === '\\') {
            inEscape = true;
          } else if (char === '"') {
            break;
          }
          endPos++;
        }
        question = jsonStr.substring(firstQuote + 1, endPos);
        // 이스케이프 문자 처리
        question = question.replace(/\\"/g, '"').replace(/\\n/g, '\n');
      }
    }
    
    const choicesMatch = jsonStr.match(/"choices"\s*:\s*\[([\s\S]*?)\]/);
    const answerMatch = jsonStr.match(/"answer"\s*:\s*(\d)/);
    
    if (question && choicesMatch && answerMatch) {
      // choices 파싱
      const choicesStr = choicesMatch[1];
      const choices = [];
      const choiceMatches = choicesStr.matchAll(/"([^"]+)"/g);
      for (const match of choiceMatches) {
        choices.push(match[1]);
      }
      
      if (choices.length >= 4) {
        return {
          question: question,
          choices: choices,
          answer: parseInt(answerMatch[1]),
          explanation: '(자동 복구됨)'
        };
      }
    }
    
    return null;
  } catch (e) {
    console.error('JSON 복구 실패:', e.message);
    return null;
  }
}

/**
 * 문항 데이터 필수 필드 검증
 */
function validateQuestionData(data) {
  const requiredFields = ['question', 'choices', 'answer'];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      throw new Error(`필수 필드 누락: ${field}`);
    }
  }
  
  // choices 배열 검증
  if (!Array.isArray(data.choices) || data.choices.length < 4) {
    throw new Error('choices는 최소 4개 이상의 배열이어야 합니다.');
  }
  
  // answer 숫자 검증
  const answer = Number(data.answer);
  if (isNaN(answer) || answer < 1 || answer > data.choices.length) {
    throw new Error(`answer는 1-${data.choices.length} 사이의 숫자여야 합니다.`);
  }
  
  return true;
}


