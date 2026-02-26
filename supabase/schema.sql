-- ══════════════════════════════════════
-- KRITIK 데이터베이스 스키마
-- Supabase SQL Editor에 붙여넣고 실행하세요
-- ══════════════════════════════════════

-- 게임 테이블
CREATE TABLE IF NOT EXISTS games (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  developer   TEXT NOT NULL,
  publisher   TEXT,
  year        INTEGER NOT NULL,
  genre       TEXT NOT NULL,
  platforms   TEXT[] DEFAULT '{}',
  critic_score INTEGER CHECK (critic_score >= 0 AND critic_score <= 100),
  status      TEXT DEFAULT 'published'
              CHECK (status IN ('published', 'draft', 'upcoming')),
  cover_url   TEXT,
  description TEXT,
  age_rating  TEXT DEFAULT '전체이용가',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 전문가 리뷰 테이블
CREATE TABLE IF NOT EXISTS critic_reviews (
  id            SERIAL PRIMARY KEY,
  game_id       INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  media         TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  score         INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  review_text   TEXT NOT NULL,
  published_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 유저 리뷰 테이블
CREATE TABLE IF NOT EXISTS user_reviews (
  id          SERIAL PRIMARY KEY,
  game_id     INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  nickname    TEXT NOT NULL,
  stars       INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  review_text TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 기자 계정 테이블
CREATE TABLE IF NOT EXISTS journalists (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  media        TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  review_count INTEGER DEFAULT 0,
  status       TEXT DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved')),
  joined_at    DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 신고 테이블
CREATE TABLE IF NOT EXISTS reports (
  id               SERIAL PRIMARY KEY,
  user_review_id   INTEGER REFERENCES user_reviews(id) ON DELETE CASCADE,
  game_title       TEXT NOT NULL,
  user_nickname    TEXT NOT NULL,
  review_text      TEXT NOT NULL,
  reason           TEXT NOT NULL,
  report_count     INTEGER DEFAULT 1,
  status           TEXT DEFAULT 'pending'
                   CHECK (status IN ('pending', 'resolved')),
  reported_at      DATE DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 사이트 설정 테이블 (메인 노출 게임 등)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ══════════════════════════════════════
-- Row Level Security (RLS)
-- ══════════════════════════════════════

ALTER TABLE games          ENABLE ROW LEVEL SECURITY;
ALTER TABLE critic_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reviews   ENABLE ROW LEVEL SECURITY;
ALTER TABLE journalists    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings       ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 허용
CREATE POLICY "games_public_read"          ON games          FOR SELECT USING (true);
CREATE POLICY "critic_reviews_public_read" ON critic_reviews FOR SELECT USING (true);
CREATE POLICY "user_reviews_public_read"   ON user_reviews   FOR SELECT USING (true);
CREATE POLICY "settings_public_read"       ON settings       FOR SELECT USING (true);

-- 유저 리뷰 익명 작성 허용
CREATE POLICY "user_reviews_insert"        ON user_reviews   FOR INSERT WITH CHECK (true);

-- 관리자 전용 (service_role key로만 접근)
-- journalists, reports, settings 수정은 service_role 키로만 가능
CREATE POLICY "journalists_admin_all"      ON journalists    FOR ALL  USING (auth.role() = 'service_role');
CREATE POLICY "reports_admin_all"          ON reports        FOR ALL  USING (auth.role() = 'service_role');
CREATE POLICY "settings_admin_all"         ON settings       FOR ALL  USING (auth.role() = 'service_role');
CREATE POLICY "games_admin_all"            ON games          FOR ALL  USING (auth.role() = 'service_role');
CREATE POLICY "critic_reviews_admin_all"   ON critic_reviews FOR ALL  USING (auth.role() = 'service_role');

-- ══════════════════════════════════════
-- 초기 샘플 데이터
-- ══════════════════════════════════════

INSERT INTO games (title, developer, publisher, year, genre, platforms, critic_score, status, cover_url, description, age_rating) VALUES
('Elden Ring', 'FromSoftware', 'Bandai Namco', 2022, '액션 RPG', ARRAY['PS5','Xbox','PC'], 96, 'published',
 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Elden_Ring_-_Box_Art.jpg/800px-Elden_Ring_-_Box_Art.jpg',
 '조지 R.R. 마틴과 미야자키 히데타카가 함께 만든 방대한 오픈 월드. 광활한 랜덤 필드를 탐험하는 매 순간이 발견과 경이로 가득한, 2022년 최고의 게임.', '청소년이용불가'),

('Baldur''s Gate 3', 'Larian Studios', 'Larian Studios', 2023, 'RPG', ARRAY['PC','PS5'], 97, 'published',
 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0d/Baldur%27s_Gate_3_cover_art.jpg/220px-Baldur%27s_Gate_3_cover_art.jpg',
 'RPG 역사를 새로 쓴 작품. 선택의 무게감과 캐릭터의 깊이가 모든 기대치를 뛰어넘는다.', '청소년이용불가'),

('God of War Ragnarök', 'Santa Monica Studio', 'Sony', 2022, '액션', ARRAY['PS5','PC'], 94, 'published',
 'https://upload.wikimedia.org/wikipedia/en/thumb/e/ee/God_of_War_Ragnar%C3%B6k_cover.jpg/220px-God_of_War_Ragnar%C3%B6k_cover.jpg',
 '크레토스와 아트레우스의 부자 관계가 이 게임의 진짜 핵심.', '청소년이용불가'),

('Hades', 'Supergiant Games', 'Supergiant Games', 2020, '인디', ARRAY['PC','PS5','Xbox','Mobile'], 93, 'published',
 'https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Hades_game_cover_art.jpg/220px-Hades_game_cover_art.jpg',
 '로그라이크와 스토리텔링의 완벽한 융합.', '15세이용가'),

('Hollow Knight', 'Team Cherry', 'Team Cherry', 2017, '인디', ARRAY['PC','PS5','Xbox'], 90, 'published',
 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Hollow_Knight_cover.png/220px-Hollow_Knight_cover.png',
 '인디 게임이 이 수준까지 가능한지 몰랐다.', '전체이용가'),

('Cyberpunk 2077', 'CD Projekt Red', 'CD Projekt', 2020, 'RPG', ARRAY['PS5','Xbox','PC'], 86, 'published',
 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9f/Cyberpunk_2077_box_art.jpg/220px-Cyberpunk_2077_box_art.jpg',
 '대규모 패치 이후 완전히 다른 게임이 됐다.', '청소년이용불가'),

('GTA VI', 'Rockstar Games', 'Rockstar Games', 2025, '액션', ARRAY['PS5','Xbox'], NULL, 'upcoming',
 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a5/Grand_Theft_Auto_VI_logo.png/220px-Grand_Theft_Auto_VI_logo.png',
 '역대 가장 기대되는 게임.', '청소년이용불가'),

('Hollow Knight: Silksong', 'Team Cherry', 'Team Cherry', 2025, '인디', ARRAY['PC','PS5','Xbox'], NULL, 'upcoming',
 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Hollow_Knight_cover.png/220px-Hollow_Knight_cover.png',
 '전작의 정신적 후속작.', '전체이용가');

INSERT INTO critic_reviews (game_id, media, reviewer_name, score, review_text, published_at) VALUES
(1, '게임동아',      '김지훈 기자', 98, '오픈월드와 소울 시리즈의 DNA가 이토록 완벽하게 융합될 수 있다는 것을 증명한 작품. 광활한 랜덤 필드를 탐험하는 매 순간이 발견과 경이로 가득하다.', '2022-03-02'),
(1, '루리웹',        '박성현 기자', 95, '플레이어에게 끊임없이 "다음에는 뭐가 있을까"라는 기대감을 심어주는 설계의 천재성. 난이도에 대한 논란이 있을 수 있지만, 그 벽을 넘는 순간의 쾌감은 어떤 게임도 따라오지 못한다.', '2022-03-04'),
(1, '인벤',          '이수민 기자', 96, '2022년 최고의 게임이라는 타이틀이 전혀 아깝지 않다. 조지 R.R. 마틴의 세계관 설정이 더해져 기존 소울 시리즈보다 한층 깊어진 스토리 밀도, 역대급 보스 라인업까지.', '2022-03-05'),
(1, '디스이즈게임',  '최다현 기자', 88, '완성도와 규모 면에서 압도적인 작품임은 분명하나, 지나치게 높은 진입 장벽과 초반부의 정보 부족은 신규 유저에게 혹독하게 느껴질 수 있다.', '2022-03-08'),
(2, '게임동아',      '김지훈 기자', 98, 'RPG 역사를 새로 쓴 작품. 선택의 무게감과 캐릭터의 깊이가 모든 기대치를 뛰어넘는다. 2023년 단 하나의 게임을 꼽으라면 주저 없이 이 작품이다.', '2024-01-15'),
(3, '인벤',          '이수민 기자', 94, '크레토스와 아트레우스의 부자 관계가 이 게임의 진짜 핵심. 웅장한 북유럽 신화 스케일 속에서도 두 사람의 감정선은 한 순간도 흔들리지 않는다.', '2024-01-08'),
(6, '루리웹',        '박성현 기자', 89, '대규모 패치 이후 완전히 다른 게임이 됐다. 나이트 시티의 세계관 밀도와 스토리 완성도는 출시 당시의 논란을 모두 잠재울 만큼 탁월하다.', '2024-01-02');

INSERT INTO user_reviews (game_id, nickname, stars, review_text) VALUES
(1, '탐험가김씨',  5, '400시간을 투자했는데도 아직도 새로운 걸 발견합니다. 이 정도 밀도의 오픈월드는 처음이에요.'),
(1, '소울초보자',  4, '소울 시리즈를 처음 접했는데 생각보다 훨씬 재밌었어요. 오픈월드 덕분에 막히면 다른 곳을 먼저 가면 되니까 덜 답답하더라고요.'),
(1, '프롬팬15년', 5, '데몬즈소울부터 시작해서 모든 프롬 게임을 해봤는데, 엘든링은 확실히 집대성입니다.');

INSERT INTO journalists (name, media, email, review_count, status) VALUES
('김민준', '게임동아',    'kim@gamedonga.co.kr',  24, 'approved'),
('이서연', '인벤',        'lee@inven.co.kr',       18, 'approved'),
('박지호', '루리웹',      'park@ruliweb.com',       31, 'approved'),
('최유진', '디스이즈게임','choi@thisisgame.com',    9,  'approved'),
('한승우', '게임메카',    'han@gamemeca.com',        0,  'pending'),
('정다은', 'IGN 코리아',  'jung@kr.ign.com',         0,  'pending');

INSERT INTO reports (game_title, user_nickname, review_text, reason, report_count) VALUES
('Elden Ring',      '익명유저123',  '이 게임은 그냥 쓰레기임. 왜 이런 게임이 높은 점수를 받는지 이해 못 함.', '욕설·부적절한 표현', 5),
('Baldur''s Gate 3','trollking99',  '이 게임 절대 하지마세요! 제 컴퓨터 고장났어요. 환불도 안 되고 사기임.', '허위 정보 유포',    3),
('Cyberpunk 2077',  'spamuser007',  '클릭해서 무료 게임 받으세요 진짜 무료임',                               '스팸·광고성 콘텐츠',8);

INSERT INTO settings (key, value) VALUES ('featured_game_id', '1');
