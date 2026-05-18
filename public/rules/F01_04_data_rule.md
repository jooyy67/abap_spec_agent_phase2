*******************************************************************************
LOOP AT 내부테이블 규칙
*******************************************************************************
[BLOCK: F01_LOOP]
use_when: 내부테이블 행 단위 처리 필요
output: F01
purpose: 내부테이블 데이터 가공 및 상태 변경 처리

*목적
조회 결과 및 화면 데이터의 행 단위 처리를 위함

*예시
LOOP AT gt_data INTO gs_data.

  IF gs_data-icon IS INITIAL.
    gs_data-icon = icon_led_green.

    MODIFY gt_data FROM gs_data INDEX sy-tabix
                                TRANSPORTING icon.
  ENDIF.

ENDLOOP.

*작성 규칙
내부테이블 가공 시 LOOP AT 사용
현재 행 수정 시 MODIFY ... INDEX sy-tabix 사용

특정 필드만 변경하는 경우 TRANSPORTING을 사용한다
불필요한 전체 구조 업데이트는 지양한다

LOOP 내부 SELECT는 지양한다
가공 로직이 길어지면 FORM으로 분리한다

*******************************************************************************
 READ TABLE + BINARY SEARCH 규칙
*******************************************************************************
[BLOCK: F01_READ_TABLE]
use_when: 내부테이블 조회 필요
output: F01
purpose: 내부테이블에서 데이터 조회 (성능 최적화)

*목적
대용량 데이터 조회 성능 향상

*예시
SORT gt_data BY key.

READ TABLE gt_data INTO gs_data
  WITH KEY key = value
  BINARY SEARCH.

*작성 규칙
BINARY SEARCH 사용 전 반드시 SORT 수행
대용량 데이터에서만 사용
소량 데이터에는 일반 READ TABLE 사용

*******************************************************************************
 데이터 가공 전 SORT 규칙
*******************************************************************************
[BLOCK: F01_SORT]
use_when: 정렬 또는 BINARY SEARCH 사용 전
output: F01
purpose: 내부테이블 정렬 및 조회 정확도 확보

*목적
데이터 매핑 및 조회 정확도 확보

*예시
SORT gt_skat BY saknr.

LOOP AT gt_docu.
  READ TABLE gt_skat ... BINARY SEARCH.
ENDLOOP.

*작성 규칙
READ TABLE BINARY SEARCH 전 반드시 SORT
JOIN 대신 내부 매핑 시 사용
정렬 기준과 조회 키 일치

*******************************************************************************
MODIFY / APPEND / DELETE 규칙
*******************************************************************************
[BLOCK: F01_TABLE_CONTROL]
use_when: 내부테이블 데이터 변경 필요
output: F01
purpose: 데이터 추가, 수정, 삭제 처리

*목적
내부테이블 데이터의 추가, 수정, 삭제를 명확하게 처리하기 위함

*예시
APPEND gs_data TO gt_data.

MODIFY gt_data FROM gs_data INDEX sy-tabix
                                           TRANSPORTING icon status.

DELETE gt_data INDEX lv_tabix.

*작성 규칙
신규 행 추가는 APPEND를 사용한다
기존 행 수정은 MODIFY를 사용한다
특정 행 삭제는 DELETE를 사용한다

LOOP 내부에서 현재 행을 수정하는 경우 INDEX sy-tabix를 명확히 사용한다
특정 필드만 변경하는 경우 MODIFY ... TRANSPORTING을 사용한다
불필요한 전체 구조 갱신은 지양한다

삭제 기준은 INDEX 또는 KEY를 명확히 지정한다
내부테이블 변경 후 ALV 출력 데이터인 경우 refresh 여부를 검토한다
추가, 수정, 삭제 로직이 복잡한 경우 별도 FORM으로 분리한다
sy-tabix는 시스템 변수이므로 전역변수로 관리하지 않는다
LOOP 외부에서 사용할 경우 로컬 변수에 담아 사용하거나 USING 파라미터로 전달한다

*******************************************************************************
MOVE-CORRESPONDING 규칙
*******************************************************************************
[BLOCK: F01_MOVE_CORR]
use_when: 구조 간 데이터 복사 필요
output: F01
purpose: 동일 필드명 기준 데이터 복사

*목적
동일한 필드명을 가진 구조 또는 내부테이블 간 데이터를 효율적으로 복사하기 위함

*예시
MOVE-CORRESPONDING gs_source TO gs_target.

LOOP AT gt_data INTO gs_data.
  MOVE-CORRESPONDING gs_data TO gs_save.
  APPEND gs_save TO gt_save.
ENDLOOP.

*작성 규칙
동일 필드명을 기준으로 값 복사가 필요한 경우 MOVE-CORRESPONDING을 사용한다
화면 출력용 구조를 저장용 구조로 변환할 때 사용할 수 있다
조회 결과를 가공용 또는 저장용 Internal Table로 옮길 때 사용할 수 있다
의미 없이 전체 복사 용도로 남용하지 않는다
복사 대상 구조의 필드 정의를 사전에 확인한다
복사 후 별도 가공이 필요한 필드는 MOVE-CORRESPONDING 이후에 처리한다
필드명이 다른 경우에는 개별 대입을 사용한다


*******************************************************************************
DO LOOP 규칙
*******************************************************************************
[BLOCK: F01_DO]
use_when: 반복 횟수가 명확한 경우
output: F01
purpose: 횟수 기반 반복 처리

*목적
반복 횟수가 명확한 계산 또는 테스트성 반복 로직을 처리하기 위함

*예시
DO 10 TIMES.

  lv_cnt += 1.
  APPEND lv_cnt TO gt_num.

ENDDO.

*작성 규칙
반합하다
중첩 DO LOOP는 복 횟수가 명확할 때 DO ... TIMES를 사용한다
단순 횟수 기반 반복 처리에 적필요한 경우에만 사용한다
과도한 중첩 반복은 성능과 가독성을 저하시킬 수 있으므로 지양한다

내부테이블 행 자체를 처리하는 경우에는 DO보다 LOOP AT을 우선 사용한다
복잡한 반복 로직은 별도 FORM으로 분리한다
