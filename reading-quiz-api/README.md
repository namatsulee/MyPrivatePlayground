# 📖 Reading Quiz Generator API

영어 독해 문항 자동 생성 API 서버

엑셀로 정의된 문항 정책과 지문 속성을 기반으로, OpenAI API를 사용해 중학교 2학년 수준의 독해 문제를 자동 생성합니다.

## 🚀 빠른 시작

### 1. 설치

```bash
cd reading-quiz-api
npm install
```

### 2. 환경 설정

```bash
# 환경 파일 복사
cp env.sample .env

# .env 파일 편집하여 OpenAI API 키 입력
```

### 3. 서버 실행

```bash
# 프로덕션
npm start

# 개발 (자동 재시작)
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

## 📡 API 엔드포인트

### POST /api/generate

문항 생성 메인 엔드포인트

**요청 예시:**

```json
{
  "text_id": "T_M2_001",
  "passage": "The digital revolution has fundamentally transformed...",
  "max_types": 5
}
```

**응답 예시:**

```json
{
  "success": true,
  "text_id": "T_M2_001",
  "generated_types": ["R_MAIN", "R_DETAIL", "R_INFER_BLANK"],
  "questions": [
    {
      "type_id": "R_MAIN",
      "question": "다음 글의 주제로 가장 적절한 것은?",
      "choices": ["선지1", "선지2", "선지3", "선지4", "선지5"],
      "answer": 2,
      "explanation": "..."
    }
  ],
  "summary": {
    "total": 3,
    "success": 3,
    "failed": 0
  }
}
```

### POST /api/generate/single

단일 유형 문항 생성

```json
{
  "type_id": "R_MAIN",
  "passage": "..."
}
```

### GET /api/types

사용 가능한 문항 유형 목록 조회

### GET /api/texts

등록된 지문 목록 조회 (엑셀 기반)

### POST /api/analyze

지문 분석 - 어떤 문항 유형이 출제 가능한지 확인

```json
{
  "text_id": "T_M2_001",
  "text_features": {
    "explicit_facts": 3,
    "has_conclusion": true,
    "tone": "factual"
  }
}
```

## 📊 엑셀 파일 구조

### Question_Types 시트

문항 유형 사전

| 컬럼 | 설명 |
|------|------|
| type_id | 유형 ID (예: R_MAIN, R_DETAIL) |
| name | 유형명 |
| priority | 출제 우선순위 (낮을수록 우선) |
| category | 대분류 (MAIN, DETAIL, INFER 등) |

### Text_Features 시트

지문 속성 데이터

| 컬럼 | 설명 |
|------|------|
| text_id | 지문 ID |
| explicit_facts | 명시적 사실 수 |
| has_example | 예시 포함 여부 (Y/N) |
| has_conclusion | 결론 포함 여부 (Y/N) |
| implicit_meaning | 함축 의미 여부 (Y/N) |
| main_topic_count | 주제 수 |
| tone | 어조 (factual/evaluative/narrative) |
| sentence_length | 문장 길이 (S/M/L) |
| has_logical_connectors | 논리 연결어 여부 (Y/N) |
| has_clear_progression | 명확한 전개 여부 (Y/N) |

### Type_Requirements 시트

문항 유형별 출제 조건

| 컬럼 | 설명 |
|------|------|
| type_id | 유형 ID |
| feature | 조건 속성 |
| operator | 연산자 (=, >=, <= 등) |
| value | 조건 값 |

## 📚 지원 문항 유형

| 유형 ID | 이름 | 분류 |
|---------|------|------|
| R_MAIN | 주제/요지 | 대의 |
| R_DETAIL | 내용 일치 | 세부 |
| R_DETAIL_SPECIFIC | 특정 정보 | 세부 |
| R_INFER_REF | 지칭 추론 | 추론 |
| R_INFER_SUMMARY | 요약문 빈칸 | 추론 |
| R_INFER_BLANK | 본문 빈칸 | 추론 |
| R_INFER_MEANING | 의미 추론 | 추론 |
| R_GRAMMAR_USAGE | 동일 용법 | 어법 |
| R_GRAMMAR_ERROR | 어법 오류 | 어법 |
| R_VOCAB_SYN | 유의어 | 어휘 |
| R_VOCAB_ANT | 반의어 | 어휘 |
| R_VOCAB_DEF | 영영뜻풀이 | 어휘 |
| R_VOCAB_CONTEXT | 문맥상 어휘 | 어휘 |
| R_FLOW_IRRELEVANT | 무관한 문장 | 논리 |
| R_FLOW_SENTENCE | 문장 순서 | 논리 |
| R_FLOW_PARAGRAPH | 문단 순서 | 논리 |
| R_FLOW_INSERT | 문장 위치 | 논리 |

## 🏗️ 프로젝트 구조

```
reading-quiz-api/
├── src/
│   ├── server.js              # 메인 서버
│   ├── routes/
│   │   └── generate.js        # API 라우트
│   ├── services/
│   │   ├── excelService.js    # 엑셀 파싱
│   │   ├── eligibilityService.js  # 유형 결정 로직
│   │   └── questionService.js # OpenAI 연동
│   └── prompts/
│       └── index.js           # 유형별 프롬프트
├── data/
│   └── passages/              # 지문 저장 (선택)
├── package.json
├── env.sample
└── README.md
```

## 🔧 핵심 설계 원칙

1. **엑셀 = 설계 도구**: 엑셀에서 정책과 조건을 정의
2. **동적 계산**: Eligibility, Final Type List는 저장하지 않고 요청 시 계산
3. **유형별 분리**: 한 API 호출 = 한 문항 (유형별 완전 분리)
4. **모듈화**: MCP 또는 다른 Tool로 이전 가능한 구조

## 📝 라이센스

ISC



