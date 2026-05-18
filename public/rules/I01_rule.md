*******************************************************************************
I01 Include (PAI)
*******************************************************************************
[BLOCK: I01_BASE]
use_when: ALWAYS
output: I01
purpose: 사용자 입력 처리 및 이벤트 분기

* 목적 
사용자 입력 처리 및 이벤트 분기

* 작성 규칙 
- OK_CODE 기반 사용자 이벤트 처리
- 화면 종료 및 메모리 해제 처리
- 실제 로직은 FORM으로 위임
- DB 처리 및 비즈니스 로직 직접 작성 금지
- SELECT / INSERT / UPDATE / DELETE 직접 작성 금지
- OK_CODE는 화면 기능에 맞게 개발자가 직접 정의할 수 있다
- PF-STATUS에 정의된 기능코드와 반드시 일치해야 한다
- OK_CODE는 처리 후 CLEAR하여 중복 실행을 방지한다

*******************************************************************************
 화면 종료 및 객체 해제
*******************************************************************************
[BLOCK: I01_EXIT]
use_when: NEED_EXIT = Y
output: I01
purpose: 화면 종료 및 메모리 해제

* 목적 
메모리 누수 방지 및 화면 종료 처리

* 예시 
MODULE exit INPUT.

  CALL METHOD : go_alv_grid->free,
                go_html_cntrl->free,
                go_container->free,
                go_top_container->free.

  FREE : go_alv_grid, go_html_cntrl,
         go_container, go_top_container.

  LEAVE TO SCREEN 0.

ENDMODULE.

* 작성 규칙 
- 화면 종료 시 UI 객체를 먼저 해제한 후 종료한다
- ALV, Container, HTML Control 등 생성된 모든 객체를 해제 대상에 포함한다
- CALL METHOD …->free로 객체 내부 자원을 해제한다
- FREE 구문으로 참조 변수까지 초기화한다
- 화면 종료는 LEAVE TO SCREEN 0을 사용한다

*******************************************************************************
 사용자 커맨드 처리
*******************************************************************************
[BLOCK: I01_COMMAND]
use_when: HAS_BUTTON = Y
output: I01
purpose: OK_CODE 기반 이벤트 분기

* 목적 
버튼 및 사용자 액션을 OK_CODE 기준으로 분기 처리한다.

* 예시 
MODULE user_command_0100 INPUT.

  DATA lv_okcode TYPE sy-ucomm.

  lv_okcode = gv_okcode.
  CLEAR gv_okcode.

  CASE lv_okcode.
    WHEN 'SAVE'.
      PERFORM save_data.
    WHEN 'IROW'.
      PERFORM process_row USING 'I'.
    WHEN 'DROW'.
      PERFORM process_row USING 'D'.
  ENDCASE.

ENDMODULE.

* 작성 규칙 
- OK_CODE는 로컬 변수(lv_okcode)로 이동 후 사용한다
- gv_okcode는 즉시 CLEAR하여 중복 실행을 방지한다
- 분기 처리는 CASE lv_okcode 구조를 사용한다
- 모든 처리 로직은 FORM으로 위임한다
- DB 처리 및 비즈니스 로직은 직접 작성하지 않는다
- OK_CODE는 PF-STATUS 기능코드와 반드시 일치해야 한다

*******************************************************************************
탭 클릭 처리
*******************************************************************************
[BLOCK: I01_TAB]
use_when: TAB = Y
output: I01
purpose: 탭 상태 처리

* 목적 
탭 선택 이벤트를 처리하고 현재 탭 상태를 관리한다.

* 예시 
MODULE user_command_0100 INPUT.

  DATA lv_okcode TYPE sy-ucomm.

  lv_okcode = gv_okcode.
  CLEAR gv_okcode.

  " 탭 클릭 처리
  IF lv_okcode(3) = 'TAB'.
    gv_tab = lv_okcode.
  ENDIF.

ENDMODULE.

* 작성 규칙 
- OK_CODE prefix를 기준으로 탭 이벤트를 판단한다
- gv_tab 변수로 현재 탭 상태를 관리한다
- 문자열 비교는 prefix 기준으로 처리한다
- 탭 값은 프로그램 전반에서 일관되게 사용한다
- OK_CODE 처리 흐름(복사 → CLEAR → 분기)을 동일하게 유지한다