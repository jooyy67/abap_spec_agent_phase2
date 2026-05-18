
*******************************************************************************
 MESSAGE 규칙
*******************************************************************************
[BLOCK: F01_MESSAGE]
use_when: 상태 안내 또는 오류 메시지 필요
output: F01
purpose: 사용자에게 성공, 오류, 경고, 안내 메시지 전달

*목적
사용자에게 상태 및 오류 메시지를 전달하기 위함

*예시
IF gt_data IS INITIAL.
  MESSAGE s001 DISPLAY LIKE 'E'.
  EXIT.
ENDIF.

MESSAGE s000 WITH '저장이 완료되었습니다.'.

MESSAGE s000 WITH '필수값을 입력하세요.' DISPLAY LIKE 'E'.

*작성 규칙
메시지 타입은 목적에 맞게 구분하여 사용한다
  - S : 일반 안내 (성공, 완료 메시지)
  - E : 오류 (처리 중단)
  - W : 경고 (사용자 확인 필요)
  - I : 정보성 메시지

경고(W) 메시지는 사용자 흐름이 모호해질 수 있으므로 사용을 최소화한다
대부분의 경우 S DISPLAY LIKE 'E' 또는 E 메시지로 대체한다

오류성 메시지는 DISPLAY LIKE 'E'를 사용하여 강조할 수 있다
S 타입 메시지를 DISPLAY LIKE 'E'로 사용하는 경우, 필요 시 RETURN 또는 EXIT을 함께 사용하여 흐름을 제어한다

검증 실패 시 즉시 MESSAGE 처리 후 RETURN 또는 EXIT 한다
조회 결과 없음, 필수값 누락, 권한 오류 등은 오류 메시지로 처리한다

MESSAGE 클래스(s000 등)는 프로그램 또는 패키지 기준으로 통일하여 사용한다
하드코딩 문자열 대신 MESSAGE 클래스를 우선 사용한다

사용자에게 이해하기 쉬운 업무 용어 중심으로 메시지를 작성한다
동일 상황에서는 동일 메시지를 사용하여 일관성을 유지한다

*******************************************************************************
저장 후 후처리 FORM 규칙
*******************************************************************************
[BLOCK: F01_AFTER_SAVE]
use_when: 저장 후 재조회 또는 화면 갱신 필요
output: F01
purpose: 저장 완료 후 메시지 처리, 재조회, ALV 갱신 수행

*목적
저장 완료 후 메시지 처리, 재조회, 화면 갱신 등을 수행하기 위함

*예시
FORM after_save.

  MESSAGE s000 WITH '저장이 완료되었습니다.'.
  PERFORM get_data.
  CALL METHOD go_alv_grid->refresh_table_display.

ENDFORM.

*작성 규칙
저장 후 후처리 FORM에서는 성공 메시지, 재조회, ALV refresh, 화면 초기화 등을 수행한다
DB 저장 구문은 포함하지 않는다
저장 성공/실패 결과에 따라 후속 동작을 구분한다
화면 표시 데이터와 실제 저장 결과가 불일치하지 않도록 재조회 또는 refresh 여부를 검토한다


*******************************************************************************
저장 전체 흐름 규칙
*******************************************************************************
[BLOCK: F01_SAVE_FLOW]
use_when: 저장 기능 존재
output: F01
purpose: 저장 프로세스를 단계별로 제어

CHECK_CHANGED_DATA
→ CHECK_DATA
→ MAKE_SAVE_DATA
→ SAVE_DB_DATA
→ AFTER_SAVE


*목적
저장 프로세스를 단계별로 명확하게 분리하여 안정적으로 처리하기 위함

*예시
FORM save_data.

  CALL METHOD go_alv_grid->check_changed_data.

  PERFORM check_data.
  PERFORM make_save_data.
  PERFORM save_db_data.
  PERFORM after_save.

ENDFORM.

*작성 규칙
저장 흐름은 원칙적으로 다음 순서를 따른다
  1. ALV 변경 반영(check_changed_data)
  2. 저장 전 검증(check_data)
  3. 저장 대상 구성(make_save_data)
  4. DB 저장(save_db_data)
  5. 저장 후 후처리(after_save)

각 단계는 역할에 따라 분리하며 하나의 FORM에 혼합 작성하지 않는다
저장 로직은 내부테이블 기준으로 수행하며, 화면 표시 로직과 분리한다
*******************************************************************************
저장 전 검증 FORM 규칙
*******************************************************************************
*목적
저장 가능 여부를 사전에 점검하여 잘못된 데이터 저장을 방지하기 위함

*예시
FORM check_data.

  IF gt_data IS INITIAL.
    MESSAGE s001 DISPLAY LIKE 'E'.
    RETURN.
  ENDIF.

  READ TABLE gt_data INTO gs_data WITH KEY chk = 'X'.
  IF sy-subrc <> 0.
    MESSAGE s000 WITH '선택된 데이터가 없습니다.' DISPLAY LIKE 'E'.
    RETURN.
  ENDIF.

ENDFORM.

*작성 규칙
저장 전 검증 FORM은 실제 저장이 가능한 상태인지 판단하는 역할만 수행한다
필수값 입력 여부, 선택행 존재 여부, 중복 데이터 여부, 상태값 적합 여부 등을 우선 점검한다

저장 대상이 없는 경우, 선택된 행이 없는 경우, 처리 불가능한 상태값인 경우 즉시 MESSAGE 처리 후 RETURN 또는 EXIT 한다
검증 실패 시 후속 저장 로직이 수행되지 않도록 명확하게 차단한다

편집형 ALV를 사용하는 경우 검증 전에 check_changed_data를 먼저 수행하여
화면에 수정된 값이 내부테이블에 반영된 상태에서 검증하도록 한다

검증 FORM에서는 DB 저장 구문(INSERT / MODIFY / UPDATE / DELETE)을 작성하지 않는다
검증 FORM에서는 저장 대상 데이터 구성도 수행하지 않는다
오직 “저장 가능 여부 판단”에 필요한 로직만 작성한다

검증 조건이 복잡한 경우
필수값 체크, 선택행 체크, 중복 체크, 상태 체크 등으로 세분화하여 별도 FORM으로 분리할 수 있다

검증 기준은 화면 기준이 아니라 내부테이블 기준으로 수행한다
동일한 저장 로직에서는 동일한 검증 기준과 동일한 메시지를 사용하여 일관성을 유지한다


*******************************************************************************
저장 대상 구성 FORM 규칙
*******************************************************************************
*목적
화면 데이터 또는 조회 데이터를 DB 저장용 구조로 변환하기 위함

*예시
FORM make_save_data.

  CLEAR gt_save.
  LOOP AT gt_data INTO gs_data.

    CHECK gs_data-chk = 'X'.

    CLEAR gs_save.
    MOVE-CORRESPONDING gs_data TO gs_save.

    gs_save-erdat = sy-datum.
    gs_save-erzet = sy-uzeit.
    gs_save-ernam = sy-uname.

    APPEND gs_save TO gt_save.

  ENDLOOP.

ENDFORM.

*작성 규칙
저장 대상 구성 FORM은 화면 표시용 데이터와 DB 저장용 데이터를 분리하는 역할을 수행한다
출력용 Internal Table(gt_data)와 저장용 Internal Table(gt_save)는 목적에 따라 구분하여 관리한다

저장 대상이 되는 행만 선별하여 저장용 테이블에 구성한다
예를 들어 체크박스 선택 행, 상태가 특정 조건인 행, 신규/수정 대상 행만 대상으로 삼는다

MOVE-CORRESPONDING을 사용하여 공통 필드를 복사할 수 있다
단, 저장용 구조에만 필요한 필드(상태값, 생성일자, 생성시간, 사용자명 등)는 별도로 세팅한다

저장 전 필요한 데이터 가공은 이 FORM에서 수행한다
예를 들어 코드값 변환, 상태값 세팅, 기본값 보정, 계산 결과 반영, 삭제 플래그 세팅 등을 수행할 수 있다

DB 반영 구문은 이 FORM에 작성하지 않는다
COMMIT / ROLLBACK 역시 작성하지 않는다

저장 대상 테이블은 구성 전에 CLEAR 또는 REFRESH 하여 이전 데이터가 남지 않도록 한다
반복문 내에서는 APPEND 전 저장 구조를 CLEAR 하여 이전 행 값이 남지 않도록 한다

저장 대상이 많거나 유형이 다른 경우
신규용 테이블, 수정용 테이블, 삭제용 테이블을 별도로 구성할 수 있다

이 FORM의 결과는 “DB에 반영 가능한 최종 저장 대상 데이터”가 되어야 하며
이후 DB 저장 FORM에서는 추가 가공 없이 바로 반영 가능한 수준으로 만드는 것을 원칙으로 한다


*******************************************************************************
DB 저장 FORM 규칙
*******************************************************************************
*목적
구성된 저장 대상 데이터를 실제 DB 테이블에 반영하기 위함

*예시
FORM save_db_data.

  MODIFY ztmm_data FROM TABLE gt_save.

  IF sy-subrc = 0.
    COMMIT WORK.
  ELSE.
    ROLLBACK WORK.
    MESSAGE s000 WITH '저장 중 오류가 발생했습니다.' DISPLAY LIKE 'E'.
    RETURN.
  ENDIF.

ENDFORM.

*작성 규칙
INSERT / MODIFY / UPDATE / DELETE 등 실제 DB 반영 구문은 이 FORM에서만 수행한다
DB 저장 FORM에서는 저장 대상 구성이나 화면 검증 로직을 함께 작성하지 않는다

DB 반영 전 저장 대상 테이블이 비어 있는지 확인할 수 있다
저장 대상이 없는 경우 불필요한 DB 처리 없이 종료한다

저장 후에는 sy-subrc를 반드시 확인한다
실패 시 ROLLBACK WORK를 검토하고, 성공 시 COMMIT WORK 수행 여부를 명확히 한다

INSERT는 신규 데이터 저장 시 사용한다
MODIFY는 신규/수정 혼합 또는 키 기준 반영 시 사용한다
UPDATE는 기존 데이터 수정만 필요한 경우 사용한다
DELETE는 삭제 대상 데이터 반영 시 사용한다

신규, 수정, 삭제가 혼재된 경우
한 FORM 안에서 모두 처리할 수는 있으나,
가능하면 처리 목적별로 구문을 분리하여 가독성을 유지한다

DB 저장 FORM에서는 메시지 처리 기준도 명확히 한다
성공/실패 메시지는 저장 결과에 따라 일관되게 출력한다

데이터 가공 로직은 DB 저장 FORM에 작성하지 않는다
DB 저장 FORM은 “최종 저장 대상 데이터를 DB에 반영하는 역할”에 집중한다

COMMIT WORK / ROLLBACK WORK 사용 여부는 프로그램 저장 단위에 맞게 일관되게 관리한다
여러 테이블을 동시에 저장하는 경우에는 전체 성공/실패 기준을 먼저 정의한 뒤 트랜잭션 처리를 수행한다

예외 상황 발생 시 부분 저장, 중복 저장, 불완전 저장이 발생하지 않도록 주의한다
DB 반영 순서가 중요한 경우에는 부모/자식 데이터 또는 헤더/아이템 순서를 고려하여 저장한다