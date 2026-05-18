*******************************************************************************
* Class Include (C01)
*******************************************************************************
[BLOCK: C01_BASE]
use_when: ALV = Y
output: C01
purpose: 이벤트 클래스 구조 정의 기준

* 목적
ALV 이벤트 수신 및 FORM(F01) 호출 인터페이스 제공

* 작성 규칙
- Local Class 정의 및 구현만 포함한다
- 이벤트 처리용 메서드만 작성한다
- 실제 로직은 모두 FORM(F01)으로 위임한다
- C01에서는 SELECT / UPDATE / MESSAGE / LOOP 등 비즈니스 로직 작성 금지
- 클래스명은 lcl_ prefix를 사용한다
- TOP Include의 DEFERRED 선언은 필수 아님
- 클래스 타입을 TOP에서 참조할 경우에만 사용한다

*******************************************************************************
메서드 네이밍 규칙
*******************************************************************************
[BLOCK: C01_METHOD_NAMING]
use_when: EVENT = Y
output: C01
purpose: 이벤트 메서드 네이밍 표준

이벤트 메서드
double_click → PERFORM handle_double_click
user_command → PERFORM handle_user_command

이벤트는 handle_ 패턴으로 통일

*******************************************************************************
클래스 정의 (Class Definition)
*******************************************************************************
[BLOCK: C01_CLASS_DEF]
use_when: EVENT = Y
output: C01
purpose: 이벤트 클래스 정의

* 목적
ALV 이벤트를 수신하기 위한 Local Class 구조 정의

* 예시
CLASS lcl_event_handler DEFINITION FINAL.
  PUBLIC SECTION.

    CLASS-METHODS double_click
      FOR EVENT double_click OF cl_gui_alv_grid
      IMPORTING e_row e_column.

ENDCLASS.

* 작성 규칙
- 클래스는 FINAL로 선언
- PUBLIC SECTION에 이벤트 메서드 정의
- FOR EVENT 구문 사용
- IMPORTING 파라미터는 이벤트 기준으로 정의
- C01에만 작성

*******************************************************************************
클래스 구현 (Class Implementation)
*******************************************************************************
[BLOCK: C01_CLASS_IMPL]
use_when: EVENT = Y
output: C01
purpose: 이벤트 처리 구현

* 목적
ALV 이벤트 발생 시 FORM으로 위임

* 예시
CLASS lcl_event_handler IMPLEMENTATION.

  " 더블 클릭
  METHOD double_click.
    PERFORM handle_double_click USING e_row e_column.
  ENDMETHOD.

  " 핫스팟 클릭
  METHOD hotspot_click.
    PERFORM handle_hotspot_click USING e_row_id e_column_id.
  ENDMETHOD.

  " 데이터 변경
  METHOD data_changed.
    PERFORM handle_data_changed USING er_data_changed.
  ENDMETHOD.
  " 데이터 변경 완료
  METHOD data_changed_finished.
    PERFORM handle_data_changed_finished USING e_modified et_good_cells.
  ENDMETHOD.

  " 툴바 구성
  METHOD toolbar.
    PERFORM handle_toolbar USING e_object e_interactive.
  ENDMETHOD.

  " 사용자 명령
  METHOD user_command.
    PERFORM handle_user_command USING e_ucomm.
  ENDMETHOD.

ENDCLASS.

* 작성 규칙
- METHOD ~ ENDMETHOD 구조로 작성
- 각 이벤트 메서드는 handle_ FORM으로 위임
- IMPORTING 파라미터는 그대로 USING 전달
- 메서드 내부는 PERFORM 1문만 작성
- 로직, 조건문, DB 처리, MESSAGE 작성 금지
- 실제 처리는 F01 Include에서 수행

*******************************************************************************
로직 위임 패턴 (핵심 규칙)
*******************************************************************************
[BLOCK: C01_DELEGATION]
use_when: ALWAYS
output: C01
purpose: FORM 위임 구조 강제

* 목적
C01과 F01 역할 분리를 통한 구조 안정화

* 예시
METHOD user_command.
  PERFORM handle_user_command USING e_ucomm.
ENDMETHOD.

* 작성 규칙
- 모든 이벤트 처리는 FORM으로 위임
- PERFORM handle_[이벤트명] 패턴 사용
- 파라미터는 이벤트 IMPORTING 값 그대로 전달
- C01에 비즈니스 로직 작성 금지