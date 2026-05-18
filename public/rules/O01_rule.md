*******************************************************************************
 O01 Include (PBO)
*******************************************************************************
[BLOCK: O01_BASE]
use_when: ALWAYS
output: O01
purpose: PBO 기본 구조 정의


* 목적 
화면 출력 전(PBO) 상태 설정 및 화면 초기화 처리

* 작성 규칙 
- PF-STATUS 및 TITLEBAR 설정
- 화면 및 ALV 초기화 처리
- 화면 속성 제어 수행
- 실제 로직은 FORM으로 위임
- DB 처리 및 비즈니스 로직 직접 작성 금지
- SELECT / CREATE OBJECT / 데이터 가공 로직 작성 금지
- PF-STATUS, TITLEBAR, SCREEN 번호는 프로그램 목적에 맞게 정의
- 정의한 자원명은 프로그램 내에서 일관되게 사용

*******************************************************************************
 상태 및 타이틀 설정
*******************************************************************************
[BLOCK: O01_STATUS]
use_when: ALWAYS
output: O01
purpose: PF-STATUS / TITLEBAR 설정

* 목적 
메뉴 및 화면 타이틀 설정

* 예시 
SET PF-STATUS 'MENU100'.
SET TITLEBAR 'TITLE100'.

SET TITLEBAR 'TITLE100' WITH gv_cnt.

* 작성 규칙 
- PF-STATUS는 화면 기능에 맞게 정의
- TITLEBAR는 화면 목적에 맞게 정의
- 상태명/타이틀명은 일관된 네이밍 사용
- 동적 값 필요 시 WITH 사용
- 정의되지 않은 STATUS / TITLEBAR 호출 금지

*******************************************************************************
 동적 버튼 제어 (EXCLUDING)
*******************************************************************************
[BLOCK: O01_EXCLUDING]
use_when: NEED_BUTTON_CONTROL = Y
output: O01
purpose: 버튼 활성/비활성 제어


* 목적 
조건에 따라 버튼 활성/비활성 제어

* 예시 
DATA: BEGIN OF lt_menu OCCURS 0,
        okcode(10),
      END OF lt_menu.

IF gv_mode EQ 'D'.
  lt_menu-okcode = 'SAVE'.
  APPEND lt_menu.
ENDIF.

SET PF-STATUS 'MENU100' EXCLUDING lt_menu.

* 작성 규칙 
- PF-STATUS에 정의된 기능코드만 EXCLUDING으로 제어
- 제외 대상 OK_CODE는 PF-STATUS와 반드시 일치
- 모드, 권한, 상태값 기준으로 동적 제어
- 정의되지 않은 기능코드 사용 금지

*******************************************************************************
 화면 초기화 및 ALV 호출
*******************************************************************************
[BLOCK: O01_INIT]
use_when: ALV = Y OR SCREEN = Y
output: O01
purpose: 화면 및 ALV 렌더링

* 목적 
화면 및 ALV 렌더링 수행

* 예시 
MODULE init_process_control OUTPUT.
  PERFORM display_screen.
ENDMODULE.

* 작성 규칙 
- PBO는 호출 역할만 수행
- ALV 생성 및 화면 구성은 FORM으로 위임
- display_screen / display_popup 등 표준 FORM 사용
- 직접 로직 작성 금지

*******************************************************************************
화면(Screen) 및 서브스크린 정의 연계
*******************************************************************************
[BLOCK: O01_SCREEN_FLOW]
use_when: TAB = Y OR SUBSCREEN = Y
output: O01
purpose: 화면 흐름 제어

* 목적 
화면 번호 및 서브스크린을 프로그램 흐름에 맞게 제어하기 위함

* 예시 
CASE gv_tab.
  WHEN 'TAB1'.
    gv_subscreen = '0101'.
  WHEN 'TAB2'.
    gv_subscreen = '0201'.
ENDCASE.

* 작성 규칙 
- SCREEN 번호는 목적에 맞게 정의
- 메인 / 팝업 / 서브스크린 역할 구분
- 동일 프로그램 내 번호는 일관되게 관리
- 의미 있는 규칙으로 네이밍
- 호출 화면은 실제 Screen 자원과 일치해야 함
- Tabstrip/Table Control을 쓰는 경우 TOP CONTROLS 선언명·TABLEVIEW USING SCREEN 번호와 Dynpro 정의를 일치시킨다