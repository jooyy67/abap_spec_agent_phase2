*******************************************************************************
 Selection Screen Include (S01)
*******************************************************************************
[BLOCK: S01_BASE]
use_when: ALWAYS
output: S01
purpose: 조회 조건 및 입력 화면 정의 

* 목적 
조회 조건 및 입력 화면(Selection Screen)을 정의하기 위함

* 작성 규칙 
- PARAMETERS, SELECT-OPTIONS, SELECTION-SCREEN 구문만 사용한다
- DB 조회/저장 로직 작성 금지
- 권한/상태 처리 로직 작성 금지
- 화면 제어는 AT SELECTION-SCREEN OUTPUT 또는 별도 FORM으로 분리
- 모든 필드는 SPEC 정의와 연결되어야 한다
- 사용하지 않는 입력 필드 선언 금지
- 매개변수 명은 8장 이상 금지
- SELECTION-SCREEN BEGIN OF BLOCK / END OF BLOCK은 S01_BLOCK 규칙을 따르며, 동일 BLOCK ID 중복 선언 금지


*******************************************************************************
화면 블록(Block) 구성
*******************************************************************************
[BLOCK: S01_BLOCK]
use_when: HAS_BLOCK = Y
output: S01
purpose: 입력 필드 그룹화 및 화면 구분

* 목적 
입력 필드를 그룹화하고 화면을 구분하기 위함

* 예시 
SELECTION-SCREEN BEGIN OF BLOCK pa1 WITH FRAME TITLE TEXT-t01.
  " pa1 블록에 속하는 PARAMETERS / SELECT-OPTIONS만 배치
SELECTION-SCREEN END OF BLOCK pa1.

SELECTION-SCREEN BEGIN OF BLOCK pa2 WITH FRAME TITLE TEXT-t02.
  " pa2 블록에 속하는 필드
SELECTION-SCREEN END OF BLOCK pa2.

* 작성 규칙 
- 관련 필드 단위로 BLOCK 구성
- TITLE은 TEXT-xxx 텍스트 심볼 사용
- BLOCK 이름은 pa1, pa2, pa3 등 순차적으로 정의
- S01 Include 전체에서 동일 BLOCK ID는 BEGIN/END 쌍 1회만 허용한다 (pa1=PA1 동일 취급)
- 이미 END OF BLOCK으로 닫은 BLOCK ID를 다시 BEGIN OF BLOCK으로 선언하지 않는다
- BEGIN OF BLOCK과 END OF BLOCK의 BLOCK ID는 반드시 동일하게 쓴다
- BLOCK ID는 PARAMETERS/SELECT-OPTIONS 접두어(pa_, so_)와 별도 식별자이며, 필드명을 BLOCK ID로 재사용하지 않는다
- 조회조건 그룹이 1개면 pa1만 사용하고, 추가 그룹마다 pa2, pa3...을 새로 부여한다
- S01_BASE와 S01_BLOCK을 함께 쓸 때 동일 BLOCK ID를 두 번 감싸지 않는다
- 과도한 블록 분할 금지

*******************************************************************************
 PARAMETERS (단일 입력 필드)
*******************************************************************************
[BLOCK: S01_PARAMETERS]
use_when: HAS_PARAMETER = Y
output: S01
purpose: 단일 입력값 정의

* 목적 
단일 값을 입력받기 위함

* 예시 
PARAMETERS: pa_bukrs TYPE bkpf-bukrs DEFAULT '1000' OBLIGATORY MODIF ID g1.

* 작성 규칙 
- 단일 입력 값은 PARAMETERS로 정의
- TYPE은 Dictionary 필드 기준으로 정의
- 필수 입력은 OBLIGATORY 사용
- 초기값은 DEFAULT 사용
- 화면 제어 필요 시 MODIF ID 지정
- 의미 없는 DEFAULT 값 설정 금지

*******************************************************************************
SELECT-OPTIONS (범위 / 다중 입력)
*******************************************************************************
[BLOCK: S01_SELECT_OPTIONS]
use_when: HAS_RANGE = Y
output: S01
purpose: 범위 및 다중 입력 처리

* 목적 
범위(LOW~HIGH) 또는 다중 조건 입력을 처리하기 위함

* 예시 
SELECT-OPTIONS: so_budat FOR bkpf-budat
                DEFAULT '20240101' TO '20241231' SIGN I OPTION BT.

* 작성 규칙 
- 범위 또는 다중 입력은 SELECT-OPTIONS 사용
- FOR 구문은 Dictionary 필드 기준 사용
- DEFAULT는 필요 시에만 설정
- NO-EXTENSION : 다중 입력 제한 시 사용
- NO INTERVALS : 단일 값만 허용 시 사용
- 과도한 DEFAULT 범위 설정 금지

*******************************************************************************
라디오 버튼 / 체크박스 / 리스트박스
*******************************************************************************
[BLOCK: S01_SELECTION_UI]
use_when: HAS_SELECTION_UI = Y
output: S01
purpose: 선택형 입력 UI 제공

* 목적 
선택형 입력 UI 제공

* 예시 
PARAMETERS: pa_rb1 RADIOBUTTON GROUP rb1 DEFAULT 'X' USER-COMMAND chg,
            pa_rb2 RADIOBUTTON GROUP rb1.

PARAMETERS: pa_chk AS CHECKBOX DEFAULT 'X'.

PARAMETERS: pa_list TYPE char10 AS LISTBOX VISIBLE LENGTH 10.

* 작성 규칙 
- 단일 선택은 RADIOBUTTON GROUP 사용
- 이벤트 필요 시 USER-COMMAND 지정
- 다중 선택은 CHECKBOX 사용
- 드롭다운은 LISTBOX 사용
- 동일 그룹 내 RADIOBUTTON은 반드시 GROUP으로 묶는다

*******************************************************************************
서치헬프 (Matchcode)
*******************************************************************************
[BLOCK: S01_SEARCH_HELP]
use_when: NEED_SEARCH_HELP = Y
output: S01
purpose: 입력값 탐색 지원

* 목적 
입력값 탐색을 지원하기 위함

* 예시 
PARAMETERS: pa_mtart TYPE mara-mtart MATCHCODE OBJECT h_t134.

* 작성 규칙 
- 검색 도움 필요 시 MATCHCODE OBJECT 사용
- Dictionary 표준 Search Help 우선 사용
- 불필요한 Matchcode 강제 지정 금지

*******************************************************************************
화면 레이아웃 제어
*******************************************************************************
[BLOCK: S01_LAYOUT]
use_when: NEED_LAYOUT = Y
output: S01
purpose: Selection Screen 레이아웃 제어

* 목적 
Selection Screen의 시각적 구성을 제어하기 위함

* 예시 
SELECTION-SCREEN SKIP.
SELECTION-SCREEN ULINE.

* 작성 규칙 
- SKIP : 줄 간격 조정 시 사용
- ULINE : 영역 구분 시 사용
- 과도한 레이아웃 제어 금지

*******************************************************************************
화면 동적 제어 (MODIF ID)
*******************************************************************************
[BLOCK: S01_MODIF]
use_when: NEED_DYNAMIC_CONTROL = Y
output: S01
purpose: 화면 필드 동적 제어

* 목적 
조건에 따라 화면 필드 활성/비활성 처리

* 예시 
PARAMETERS: pa_bukrs TYPE bkpf-bukrs MODIF ID g1.

* 작성 규칙 
- MODIF ID로 그룹 지정
- 실제 제어는 AT SELECTION-SCREEN OUTPUT에서 수행
- S01에는 제어 로직 작성 금지
- 그룹명은 의미 있는 값 사용