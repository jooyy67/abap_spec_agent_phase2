*******************************************************************************
F01 Include - 실행제어
*******************************************************************************
[FILE: F01_02_CONTROL]
include: F01
category: 실행제어
use_when: ALWAYS
purpose: 실행 흐름 및 상태 제어 관련 규칙

*******************************************************************************
초기값 세팅 규칙
*******************************************************************************

[BLOCK: F01_INIT_VALUE]
use_when: NEED_INIT = Y
output: F01
purpose: 프로그램 실행 시 기본값 설정

*목적
프로그램 실행 시 기본값을 설정하기 위함

*예시
FORM set_init_value.

REFRESH :  so_budat[] .
CLEAR :   pa_bukrs,  pa_gjahr,
  pa_bukrs = '0001'.
  pa_gjahr = '2021'.

  so_budat-sign   = 'I'.
  so_budat-option = 'BT'.

ENDFORM.

*작성 규칙
초기값 세팅은 별도 FORM으로 분리
Parameter / Select-option을 함께 초기화
하드코딩 값은 최소화
Selection Screen과 연동하여 설정
선택화면 조건 변경 시 초기값과 충돌하지 않도록 주의

*******************************************************************************
 IF / CASE 규칙
*******************************************************************************
category: 실행제어
use_when: ALWAYS
purpose: 실행 흐름 및 상태 제어 관련 규칙

*******************************************************************************
초기값 세팅 규칙
*******************************************************************************
[BLOCK: F01_INIT_VALUE]
use_when: NEED_INIT = Y
output: F01
purpose: 프로그램 실행 시 기본값 설정

*목적
프로그램 실행 시 기본값을 설정하기 위함

*예시
FORM set_init_value.

  REFRESH : so_budat[].
  CLEAR   : pa_bukrs, pa_gjahr.

  pa_bukrs = '0001'.
  pa_gjahr = '2021'.

  so_budat-sign   = 'I'.
  so_budat-option = 'BT'.

ENDFORM.

*작성 규칙
초기값 세팅은 별도 FORM으로 분리
Parameter / Select-option을 함께 초기화
하드코딩 값은 최소화
Selection Screen과 연동하여 설정
선택화면 조건 변경 시 초기값과 충돌하지 않도록 주의

*******************************************************************************
IF / CASE 규칙
*******************************************************************************
[BLOCK: F01_BRANCH]
use_when: HAS_BRANCH = Y
output: F01
purpose: 조건 분기 및 상태별 처리


*목적
조건 분기 및 상태별 처리 로직을 구분하기 위함

*예시
IF gt_data IS INITIAL.
  MESSAGE s001 DISPLAY LIKE 'E'.
  EXIT.
ENDIF.

CASE gv_mode.
  WHEN 'D'.
    PERFORM display_mode.
  WHEN 'E'.
    PERFORM edit_mode.
ENDCASE.

*작성 규칙
단순 조건 분기는 IF 사용
상태값, 모드값, 기능코드는 CASE 사용
중첩 IF는 최소화한다
조건이 복잡하면 별도 FORM으로 분리한다

*******************************************************************************
모드 제어 규칙
*******************************************************************************
[BLOCK: F01_MODE]
use_when: MODE = Y
output: F01
purpose: 프로그램 상태값 기반 제어


*목적
조회모드, 수정모드 등 프로그램 상태에 따라 화면 및 로직을 제어하기 위함

*예시
CASE gv_mode.
  WHEN 'D'.
    PERFORM display_mode.
  WHEN 'E'.
    PERFORM edit_mode.
ENDCASE.

*작성 규칙
프로그램 모드는 전역 변수로 관리
조회, 수정, 생성 등 모드에 따라 분기 처리한다
화면 제어, 버튼 제어, ALV edit 여부는 동일한 모드 기준으로 관리한다
모드별 처리 로직은 별도 FORM으로 분리한다

*******************************************************************************
CHECK / EXIT / RETURN 규칙
*******************************************************************************
[BLOCK: F01_FLOW_CONTROL]
use_when: NEED_FLOW_CONTROL = Y
output: F01
purpose: 로직 흐름 제어

*목적
로직 흐름 제어를 위함

*예시
CHECK gt_data IS NOT INITIAL.

IF gv_error IS NOT INITIAL.
  RETURN.
ENDIF.

*작성 규칙
선행조건 체크는 CHECK 사용
FORM 종료는 RETURN 사용
LOOP 탈출은 EXIT 사용
과도한 흐름 제어는 지양한다

*******************************************************************************
 STOP / 프로그램 종료 규칙
*******************************************************************************
[BLOCK: F01_STOP]
use_when: NEED_STOP = Y
output: F01
purpose: 프로그램 실행 중단 처리

*목적
조회 결과 없음 또는 오류 시 프로그램 실행을 중단하기 위함

*예시
IF gt_data IS INITIAL.
  MESSAGE s037 DISPLAY LIKE 'E'.
  STOP.
ENDIF.

*작성 규칙
STOP은 프로그램 전체 실행을 즉시 종료한다
치명적인 오류 또는 더 이상 처리 의미가 없는 경우에만 사용한다
조회 결과 없음 시 제한적으로 사용할 수 있다

단순 검증 실패, 사용자 입력 오류 등은 RETURN 또는 EXIT을 우선 사용한다
FORM 내부에서는 STOP 대신 RETURN 사용을 권장한다단순 검증 실패는 RETURN 또는 EXIT 사용

STOP 남용은 지양한다


*******************************************************************************
LEAVE LIST-PROCESSING 규칙
*******************************************************************************
[BLOCK: F01_LEAVE_LIST]
use_when: LIST_PROCESSING = Y
output: F01
purpose: 리스트 화면 종료 처리

*목적
리스트 화면을 종료하고 이전 화면(Dynpro)으로 복귀하기 위함

*예시
LEAVE LIST-PROCESSING.

*작성 규칙
LEAVE LIST-PROCESSING은 리스트 화면(List Processing)에서 빠져나갈 때 사용한다
LEAVE TO LIST-PROCESSING과 반대 개념으로, 리스트 화면을 종료하는 역할을 한다

리스트 화면에서만 사용 가능하며 Dynpro(Screen)에서는 사용하지 않는다
WRITE 기반 출력 또는 Classical ALV(REUSE_ALV_*) 환경에서 사용된다

OO ALV(CL_GUI_ALV_GRID) 기반 프로그램에서는 사용하지 않는다
신규 개발에서는 사용을 지양하며, 기존 리스트 프로그램 유지보수 시에만 제한적으로 사용한다

프로그램 흐름 제어 목적이 아닌 화면 전환 목적의 문법이므로
STOP, RETURN, EXIT과는 용도가 다름을 구분하여 사용한다

*******************************************************************************
 LOOP AT SCREEN 규칙
*******************************************************************************
[BLOCK: F01_SCREEN_CONTROL]
use_when: NEED_SCREEN_CONTROL = Y
output: F01
purpose: 선택화면 및 화면 필드 동적 제어

*목적
선택화면 및 화면 필드 입력 가능/불가 제어를 위함

*예시
LOOP AT SCREEN.
  IF screen-group1 EQ 'RAD'.
    screen-input = 0.
  ENDIF.
  MODIFY SCREEN.
ENDLOOP.

*작성 규칙
화면 필드 동적 제어 시 사용
MODIF ID 기준으로 그룹을 관리한다
속성 변경 후 반드시 MODIFY SCREEN 수행
화면 선언부가 아닌 처리 로직에서 제어한다
 