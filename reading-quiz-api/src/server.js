/**
 * Reading Quiz Generator API Server
 * 
 * 영어 독해 문항 자동 생성 시스템의 메인 서버
 * - 엑셀 기반 정책 엔진
 * - OpenAI API 연동
 * - RESTful API 제공
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateRoute } from './routes/generate.js';
import { loadExcelData } from './services/excelService.js';

// ES Module에서 __dirname 사용
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());

// 정적 파일 서빙 (public 폴더)
app.use(express.static(path.join(__dirname, '../public')));

// 서버 시작 시 엑셀 데이터 로드
let excelData = null;

async function initializeServer() {
  try {
    console.log('📊 엑셀 데이터 로딩 중...');
    excelData = await loadExcelData(process.env.EXCEL_PATH || '../Question_Types_M2.xlsx');
    console.log('✅ 엑셀 데이터 로드 완료');
    console.log(`   - Question Types: ${excelData.questionTypes.length}개`);
    console.log(`   - Text Features: ${excelData.textFeatures.length}개`);
    console.log(`   - Type Requirements: ${excelData.typeRequirements.length}개`);
  } catch (error) {
    console.error('❌ 엑셀 데이터 로드 실패:', error.message);
    console.log('⚠️ 서버는 시작되지만 일부 기능이 제한될 수 있습니다.');
  }
}

// 엑셀 데이터를 라우트에서 접근할 수 있도록 미들웨어 설정
app.use((req, res, next) => {
  req.excelData = excelData;
  next();
});

// 라우트 설정
app.use('/api', generateRoute);

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    excelLoaded: !!excelData,
    timestamp: new Date().toISOString()
  });
});

// API 문서
app.get('/', (req, res) => {
  res.json({
    name: 'Reading Quiz Generator API',
    version: '1.0.0',
    description: '영어 독해 문항 자동 생성 API',
    endpoints: {
      'POST /api/generate': {
        description: '문항 생성',
        body: {
          text_id: 'string (필수) - 지문 ID',
          passage: 'string (선택) - 지문 원문 (text_id로 못 찾을 경우 직접 제공)'
        }
      },
      'GET /api/types': {
        description: '사용 가능한 문항 유형 목록'
      },
      'GET /api/texts': {
        description: '등록된 지문 목록'
      },
      'GET /health': {
        description: '서버 상태 확인'
      }
    }
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('❌ 서버 오류:', err);
  res.status(500).json({
    error: '서버 내부 오류가 발생했습니다.',
    message: err.message
  });
});

// 서버 시작
initializeServer().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`📖 API 문서: http://localhost:${PORT}/`);
    console.log(`💡 문항 생성: POST http://localhost:${PORT}/api/generate\n`);
  });
});

export { app };


