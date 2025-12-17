/**
 * Passage Service
 * 
 * passages 폴더에서 지문 파일을 로드하는 서비스
 * - text_id와 파일명 매칭
 * - .txt 파일 자동 로드
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// passages 폴더 경로
const PASSAGES_DIR = path.resolve(__dirname, '../../passages');

/**
 * 모든 지문 파일 목록 조회
 * @returns {Array<Object>} 지문 목록 [{text_id, filename, path}]
 */
export function listPassages() {
  try {
    if (!fs.existsSync(PASSAGES_DIR)) {
      console.warn(`⚠️ passages 폴더가 없습니다: ${PASSAGES_DIR}`);
      return [];
    }
    
    const files = fs.readdirSync(PASSAGES_DIR);
    const passages = files
      .filter(file => file.endsWith('.txt'))
      .map(file => {
        const text_id = path.basename(file, '.txt');
        return {
          text_id,
          filename: file,
          path: path.join(PASSAGES_DIR, file)
        };
      });
    
    console.log(`📁 passages 폴더에서 ${passages.length}개의 지문 발견`);
    return passages;
  } catch (error) {
    console.error('❌ 지문 목록 조회 실패:', error.message);
    return [];
  }
}

/**
 * text_id로 지문 파일 로드
 * @param {string} textId - 지문 ID (파일명에서 .txt 제외)
 * @returns {string|null} 지문 내용
 */
export function loadPassage(textId) {
  try {
    const filePath = path.join(PASSAGES_DIR, `${textId}.txt`);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ 지문 파일을 찾을 수 없습니다: ${filePath}`);
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    console.log(`📖 지문 로드 완료: ${textId} (${content.length}자)`);
    return content;
  } catch (error) {
    console.error(`❌ 지문 로드 실패 (${textId}):`, error.message);
    return null;
  }
}

/**
 * text_id 존재 여부 확인
 * @param {string} textId - 지문 ID
 * @returns {boolean}
 */
export function passageExists(textId) {
  const filePath = path.join(PASSAGES_DIR, `${textId}.txt`);
  return fs.existsSync(filePath);
}

/**
 * passages 폴더 경로 반환
 */
export function getPassagesDir() {
  return PASSAGES_DIR;
}


