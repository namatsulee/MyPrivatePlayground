/**
 * Prompts Module
 * 
 * 문항 유형별 프롬프트 정의
 * - 중학교 2학년 수준에 맞춘 프롬프트
 * - 유형별 완전 분리된 프롬프트
 */

/**
 * 공통 JSON 출력 형식
 */
const COMMON_OUTPUT_FORMAT = `
Output ONLY valid JSON in this exact format:
{
  "question": "문제 내용 또는 지시문",
  "choices": ["선지1", "선지2", "선지3", "선지4", "선지5"],
  "answer": 정답번호(1-5),
  "explanation": "정답 해설 (한글로)"
}`;

/**
 * 유형별 프롬프트 생성 함수들
 * 
 * 엑셀 유형 ID와 프롬프트 ID 매핑:
 * - R_MAIN (엑셀) = R_MAIN (프롬프트)
 * - R_TITLE (엑셀) = R_TITLE (프롬프트)
 * - R_DETAIL (엑셀) = R_DETAIL (프롬프트)
 * - R_INFER_BLANK (엑셀) = R_INFER_BLANK (프롬프트)
 * - R_INFER_MEAN (엑셀) = R_INFER_MEANING alias
 * - R_FLOW_ODD (엑셀) = R_FLOW_IRRELEVANT alias
 * - R_FLOW_ORDER (엑셀) = R_FLOW_SENTENCE alias
 * - R_FLOW_INSERT (엑셀) = R_FLOW_INSERT (프롬프트)
 * - V_SYNONYM (엑셀) = R_VOCAB_SYN alias
 * - V_ANTONYM (엑셀) = R_VOCAB_ANT alias
 * - V_MEANING (엑셀) = V_MEANING (프롬프트)
 */
const promptGenerators = {
  // ===== 대의 파악 =====
  R_MAIN: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create ONE multiple-choice question about the MAIN IDEA of the passage.

[Rules]:
- Write the question and ALL choices in KOREAN
- The correct answer must summarize the entire passage
- Wrong answers should be partially true or too narrow
- Do not ask about details
- Do not invent information
- Create exactly 5 choices

${COMMON_OUTPUT_FORMAT}`,

  // ===== 세부 정보 =====
  R_DETAIL: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create ONE multiple-choice question about SPECIFIC DETAILS in the passage.
The question type should be "내용 일치/불일치" (content match/mismatch).

[Rules]:
- Write the question and ALL choices in KOREAN
- Ask "다음 글의 내용과 일치하지 않는 것은?" or "다음 글의 내용과 일치하는 것은?"
- Each choice should reference a specific detail from the passage
- Create exactly 5 choices
- One choice should be clearly wrong (or clearly right for 일치 type)

${COMMON_OUTPUT_FORMAT}`,

  R_DETAIL_SPECIFIC: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create ONE multiple-choice question about a SPECIFIC PIECE OF INFORMATION in the passage.

[Rules]:
- Write the question and ALL choices in KOREAN
- Ask about specific details that can be directly found in the passage
- The question should be specific (e.g., "글에서 언급된 ~은 무엇인가?")
- Create exactly 5 choices

${COMMON_OUTPUT_FORMAT}`,

  // ===== 추론 =====
  R_INFER_REF: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create ONE multiple-choice question about what a PRONOUN or REFERENCE refers to.

[Rules]:
- Find a pronoun or demonstrative (it, this, they, etc.) in the passage
- Include the underlined word in the question: "밑줄 친 [word]가 가리키는 것은?"
- Write choices in KOREAN
- Create exactly 5 choices

${COMMON_OUTPUT_FORMAT}`,

  R_INFER_SUMMARY: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create a SUMMARY COMPLETION question with blanks (A) and (B).

[Rules]:
- Create a summary sentence with two blanks: (A) and (B)
- The question format: "다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?"
- Put the summary sentence with blanks in the "question" field
- Each choice should be formatted as "(A) word1 - (B) word2"
- Create exactly 5 choices

${COMMON_OUTPUT_FORMAT}`,

  R_INFER_BLANK: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create a BLANK COMPLETION question for a key sentence in the passage.

[Rules]:
- Select an important sentence from the passage
- Replace a key phrase with a blank _______
- The question format: "다음 글의 빈칸에 들어갈 말로 가장 적절한 것은?"
- Show the sentence with the blank in the "question" field
- Choices should be in English (as they fill an English blank)
- Create exactly 5 choices

${COMMON_OUTPUT_FORMAT}`,

  R_INFER_MEANING: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create a question about the IMPLIED MEANING of an expression.

[Rules]:
- Select an expression from the passage that has deeper meaning
- The question format: "밑줄 친 부분이 의미하는 바로 가장 적절한 것은?"
- Include the underlined expression in the "question" field
- Write choices in KOREAN (interpretations of the meaning)
- Create exactly 5 choices

${COMMON_OUTPUT_FORMAT}`,

  // ===== 어법 =====
  R_GRAMMAR_USAGE: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create a GRAMMAR USAGE question (동일하게 쓰인 문장 고르기).

[Rules]:
- DO NOT modify the original passage
- Select a grammatical element (relative pronoun, infinitive, participle, etc.) and underline it
- The question format: "밑줄 친 [word]와 쓰임이 같은 것은?"
- Create 5 NEW example sentences as choices (not from the passage)
- Only one choice should have the same grammatical usage
- Write the underlined element in the "question" field

${COMMON_OUTPUT_FORMAT}`,

  R_GRAMMAR_ERROR: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create a GRAMMAR ERROR question (어법상 틀린 것 고르기).

[CRITICAL RULES]:
- DO NOT delete or modify sentences
- ONLY change ONE word to be grammatically incorrect
- Mark 5 words/expressions with ①②③④⑤ underlines
- Exactly ONE should be grammatically wrong
- Show the modified passage with all 5 underlined parts in "question"
- Each choice should show the underlined word: "① word1", "② word2", etc.

${COMMON_OUTPUT_FORMAT}`,

  // ===== 어휘 =====
  R_VOCAB_SYN: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create a SYNONYM question.

[Rules]:
- Select an important vocabulary word from the passage
- The question format: "밑줄 친 [word]와 의미가 가장 가까운 것은?"
- Choices should be English words (synonyms and distractors)
- Create exactly 5 choices

${COMMON_OUTPUT_FORMAT}`,

  R_VOCAB_ANT: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create an ANTONYM question.

[Rules]:
- Select an important vocabulary word from the passage
- The question format: "밑줄 친 [word]와 의미가 반대인 것은?"
- Choices should be English words (antonyms and distractors)
- Create exactly 5 choices

${COMMON_OUTPUT_FORMAT}`,

  R_VOCAB_DEF: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create an ENGLISH DEFINITION question (영영뜻풀이).

[Rules]:
- Create an English definition of a word from the passage
- The question format: "다음 영영 뜻풀이에 해당하는 단어를 본문에서 찾으시오."
- Put the English definition in the "question" field
- Choices should be vocabulary words from the passage
- Create exactly 5 choices

${COMMON_OUTPUT_FORMAT}`,

  R_VOCAB_CONTEXT: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create a CONTEXTUAL VOCABULARY question (문맥상 어휘).

[CRITICAL RULES]:
- DO NOT delete or modify sentences
- ONLY change ONE word to be contextually incorrect (e.g., opposite meaning)
- Mark 5 words with ①②③④⑤ underlines
- Exactly ONE should be contextually wrong
- Show the modified passage with all 5 underlined parts in "question"
- The question format: "다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?"

${COMMON_OUTPUT_FORMAT}`,

  // ===== 논리 =====
  R_FLOW_IRRELEVANT: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create an IRRELEVANT SENTENCE question (흐름과 무관한 문장 찾기).

[CRITICAL RULES]:
1. Keep ALL original sentences exactly as they are (DO NOT delete or modify)
2. CREATE ONE NEW SENTENCE that is:
   - Related to a similar topic or uses similar vocabulary (to be confusing)
   - BUT actually irrelevant to the main flow/argument of the passage
   - Example: If the passage is about "Sirens in Greek mythology", the irrelevant sentence could be about "siren sounds in emergency vehicles" - same word, different meaning
3. INSERT the new sentence somewhere in the MIDDLE of the passage (not at the beginning or end)
4. Number exactly 5 consecutive sentences with ①②③④⑤ (including the new one)
5. The new irrelevant sentence is the ANSWER

[OUTPUT FORMAT]:
- "question" field: Show the passage with 5 numbered sentences like:
  "① First sentence. ② Second sentence. ③ [NEW irrelevant sentence]. ④ Fourth sentence. ⑤ Fifth sentence."
- The question instruction: "다음 글에서 전체 흐름과 관계 없는 문장은?"
- "choices": ["①", "②", "③", "④", "⑤"]
- "answer": the number of the irrelevant sentence (1-5)

${COMMON_OUTPUT_FORMAT}`,

  R_FLOW_SENTENCE: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create a SENTENCE ORDERING question (문장 순서).

[Rules]:
- Divide the passage into: Opening sentence + (A), (B), (C) parts
- Show the opening sentence and the three parts clearly
- The question format: "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?"
- Choices should be ordering combinations: "(A)-(C)-(B)", "(B)-(A)-(C)", etc.
- Create exactly 5 choices

${COMMON_OUTPUT_FORMAT}`,

  R_FLOW_PARAGRAPH: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create a PARAGRAPH ORDERING question (문단 순서).

[Rules]:
- Divide the passage into: Opening paragraph + (A), (B), (C) parts
- Show the opening paragraph and the three parts clearly
- The question format: "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?"
- Choices should be ordering combinations
- Create exactly 5 choices

${COMMON_OUTPUT_FORMAT}`,

  R_FLOW_INSERT: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create a SENTENCE INSERTION question (문장 위치).

[CRITICAL RULES]:
- Extract ONE sentence from the passage as the "given sentence"
- Mark insertion positions ①②③④⑤ between remaining sentences
- The question format: "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?"
- Format: "[주어진 문장] The extracted sentence.\\n\\n① First... ② Second... ③ Third... ④ Fourth..."
- DO NOT delete sentences - only "separate" one
- Put the formatted passage with positions in "question"

${COMMON_OUTPUT_FORMAT}`,

  // ===== 엑셀 유형 ID 추가 (R_TITLE) =====
  R_TITLE: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create ONE multiple-choice question asking for the BEST TITLE of the passage.

[Rules]:
- Write the question "다음 글의 제목으로 가장 적절한 것은?"
- Write ALL choices in KOREAN
- The correct answer should capture the main theme as a title
- Wrong answers should be too narrow, too broad, or slightly off-topic
- Create exactly 5 choices

${COMMON_OUTPUT_FORMAT}`,

  // ===== 엑셀 유형 ID 추가 (V_MEANING) =====
  V_MEANING: (passage) => `You are creating a vocabulary meaning question for Korean middle school students.

[Passage]:
${passage}

[Task]: 어휘 의미 파악 문항

[Rules]:
1. Select ONE important English word from the passage
2. Create a question asking for its Korean meaning
3. Provide 5 Korean meaning choices

[STRICT OUTPUT FORMAT - JSON ONLY]:
{
  "question": "밑줄 친 [selected word]의 의미로 가장 적절한 것은?",
  "choices": ["한글 의미1", "한글 의미2", "한글 의미3", "한글 의미4", "한글 의미5"],
  "answer": 1,
  "explanation": "해설"
}

IMPORTANT: Output ONLY the JSON above. No other text.`,

  // ===== 엑셀 유형 ID 추가 (V_SYNONYM) =====
  V_SYNONYM: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create a SYNONYM question.

[Rules]:
- Select an important vocabulary word from the passage
- The question format: "밑줄 친 [word]와 의미가 가장 가까운 것은?"
- Choices should be English words (synonyms and distractors)
- Create exactly 5 choices

${COMMON_OUTPUT_FORMAT}`,

  // ===== 엑셀 유형 ID 추가 (V_ANTONYM) =====
  V_ANTONYM: (passage) => `You are creating a middle school (Grade 8) reading comprehension question in Korean.

[Passage]:
${passage}

[Task]: Create an ANTONYM question.

[Rules]:
- Select an important vocabulary word from the passage
- The question format: "밑줄 친 [word]와 의미가 반대인 것은?"
- Choices should be English words (antonyms and distractors)
- Create exactly 5 choices

${COMMON_OUTPUT_FORMAT}`,

};

// Alias 매핑 (엑셀 유형 ID → 프롬프트 유형 ID)
const TYPE_ALIASES = {
  'R_INFER_MEAN': 'R_INFER_MEANING',
  'R_FLOW_ODD': 'R_FLOW_IRRELEVANT',
  'R_FLOW_ORDER': 'R_FLOW_SENTENCE'
};

/**
 * 문항 유형에 맞는 프롬프트 반환
 * 
 * @param {string} typeId - 문항 유형 ID
 * @param {string} passage - 지문 원문
 * @returns {string|null} 프롬프트 문자열
 */
export function getPromptForType(typeId, passage) {
  // Alias 처리: 엑셀 유형 ID → 프롬프트 유형 ID
  const resolvedTypeId = TYPE_ALIASES[typeId] || typeId;
  
  const generator = promptGenerators[resolvedTypeId];
  if (!generator) {
    console.warn(`알 수 없는 문항 유형: ${typeId} (resolved: ${resolvedTypeId})`);
    return null;
  }
  return generator(passage);
}

/**
 * 사용 가능한 모든 문항 유형 ID 반환
 */
export function getAvailableTypes() {
  // 프롬프트 유형 + Alias 유형 모두 반환
  return [...Object.keys(promptGenerators), ...Object.keys(TYPE_ALIASES)];
}

/**
 * 유형별 설명 반환
 */
export function getTypeDescriptions() {
  return {
    // 대의 파악
    R_MAIN: { name: '주제/요지', category: '대의', description: '글의 주제, 제목, 요지 파악' },
    R_TITLE: { name: '제목', category: '대의', description: '글의 제목 고르기' },
    
    // 세부 정보
    R_DETAIL: { name: '내용 일치', category: '세부', description: '내용 일치/불일치' },
    R_DETAIL_SPECIFIC: { name: '특정 정보', category: '세부', description: '특정 정보 파악' },
    
    // 추론
    R_INFER_REF: { name: '지칭 추론', category: '추론', description: '대명사/지시어가 가리키는 것' },
    R_INFER_SUMMARY: { name: '요약문 빈칸', category: '추론', description: '요약문의 빈칸 (A), (B) 채우기' },
    R_INFER_BLANK: { name: '본문 빈칸', category: '추론', description: '본문 핵심 문장 빈칸' },
    R_INFER_MEANING: { name: '의미 추론', category: '추론', description: '함축적 의미 파악' },
    R_INFER_MEAN: { name: '함의 추론', category: '추론', description: '함의/의미 추론 (엑셀 유형)' },
    
    // 어법
    R_GRAMMAR_USAGE: { name: '동일 용법', category: '어법', description: '같은 문법 용법 찾기' },
    R_GRAMMAR_ERROR: { name: '어법 오류', category: '어법', description: '어법상 틀린 것 찾기' },
    
    // 어휘 (R_ prefix)
    R_VOCAB_SYN: { name: '유의어', category: '어휘', description: '비슷한 의미 단어' },
    R_VOCAB_ANT: { name: '반의어', category: '어휘', description: '반대 의미 단어' },
    R_VOCAB_DEF: { name: '영영뜻풀이', category: '어휘', description: '영어로 된 뜻풀이' },
    R_VOCAB_CONTEXT: { name: '문맥상 어휘', category: '어휘', description: '문맥상 틀린 어휘 찾기' },
    
    // 어휘 (V_ prefix - 엑셀 유형)
    V_MEANING: { name: '어휘 의미', category: '어휘', description: '어휘 의미 파악' },
    V_SYNONYM: { name: '유의어', category: '어휘', description: '문맥상 유의어 고르기' },
    V_ANTONYM: { name: '반의어', category: '어휘', description: '문맥상 반의어 고르기' },
    
    // 논리
    R_FLOW_IRRELEVANT: { name: '무관한 문장', category: '논리', description: '흐름과 관계없는 문장 찾기' },
    R_FLOW_ODD: { name: '어색한 문장', category: '논리', description: '흐름상 어색한 문장 찾기 (엑셀 유형)' },
    R_FLOW_SENTENCE: { name: '문장 순서', category: '논리', description: '(A)(B)(C) 순서 배열' },
    R_FLOW_ORDER: { name: '순서 배열', category: '논리', description: '문단/문장 순서 배열 (엑셀 유형)' },
    R_FLOW_PARAGRAPH: { name: '문단 순서', category: '논리', description: '문단 순서 배열' },
    R_FLOW_INSERT: { name: '문장 위치', category: '논리', description: '주어진 문장 삽입 위치' }
  };
}

