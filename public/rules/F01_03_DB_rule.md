
*******************************************************************************
SELECT 규칙 (Open SQL 작성 기준)
*******************************************************************************
[BLOCK: F01_SELECT]
use_when: 조회 기능 존재
output: F01
purpose: DB 데이터 다건 조회 처리

*목적
DB 데이터 조회를 효율적이고 일관된 방식으로 수행하기 위함

*예시
SELECT bukrs, belnr, gjahr
  INTO CORRESPONDING FIELDS OF TABLE @gt_data
  FROM bkpf
 WHERE bukrs = @pa_bukrs.

*작성 규칙
Open SQL은 New Open SQL 사용을 원칙으로 한다
SQL 구문 내 ABAP Host Variable 앞에는 @ 사용을 권장한다
@ 사용 시 SELECT 문에는 ',' 를 필수로 작성한다
mandt 는 SELECT 하지 않는다

단, 기존 프로그램 유지보수 또는 시스템 환경에 따라 구 Open SQL을 사용할 수 있다

필요한 필드만 명시적으로 조회한다
SELECT * 사용은 지양한다
INTO CORRESPONDING FIELDS OF TABLE 구문을 사용하여 구조에 맞게 매핑한다
조회 로직은 FORM 내부에서만 수행한다
LOOP 내부에서 SELECT 수행은 지양하고, 필요 시 사전 일괄 조회 후 내부테이블에서 처리한다
조회 조건은 Selection Screen 파라미터 및 Select-Option과 연계하여 작성한다
조건 누락으로 인한 전체 조회(Full Scan)를 방지한다
단건 조회는 SELECT SINGLE을 사용하며, 조회 후 sy-subrc를 반드시 확인한다
대량 데이터 조회 시 성능을 고려하여 WHERE 조건 및 인덱스를 활용한다
ORDER BY는 필요한 경우에만 사용하며, 정렬이 필요한 경우 SORT와의 중복 여부를 검토한다

*******************************************************************************
SELECT SINGLE 규칙
*******************************************************************************
[BLOCK: F01_SELECT_SINGLE]
use_when: 단건 조회 필요
output: F01
purpose: DB 단건 조회 처리

*목적
단건 데이터를 효율적으로 조회하기 위함

*예시
SELECT SINGLE butxt
  INTO @gv_butxt
  FROM t001
 WHERE bukrs = @pa_bukrs.

*작성 규칙
단건 조회 시 SELECT SINGLE을 사용한다
Open SQL은 New Open SQL 사용을 원칙으로 하며, Host Variable 앞에는 @ 사용을 권장한다
단, 기존 프로그램 유지보수 시에는 기존 문법을 사용할 수 있다

텍스트, 상태값, 마스터 단건 조회에 적합하다
조회 조건은 반드시 Primary Key 또는 Unique Key 기준으로 작성한다

조회 후 sy-subrc를 반드시 확인한다
조회 실패 시 초기값 처리 또는 메시지 처리를 수행한다

LOOP 내부에서 반복 호출 시 성능에 영향을 줄 수 있으므로 지양한다
필요 시 사전 일괄 조회 후 READ TABLE 방식으로 대체한다

다건 가능성이 있는 경우 SELECT SINGLE 대신 SELECT ... UP TO 1 ROWS 사용을 검토한다

*******************************************************************************
ORDER BY 규칙
*******************************************************************************
[BLOCK: F01_ORDER]
use_when: DB 정렬 필요
output: F01
purpose: DB 조회 시 정렬 처리

*목적
DB 조회 시 필요한 정렬을 수행하여 데이터 일관성과 성능을 확보하기 위함

*예시
SELECT bukrs, belnr, gjahr
  INTO TABLE @gt_data
  FROM bkpf
  WHERE bukrs = @pa_bukrs
  ORDER BY bukrs, belnr.

*작성 규칙
ORDER BY는 DB 조회 시 정렬이 필요한 경우에 사용한다
조회 결과를 그대로 출력하거나 추가 정렬이 필요 없는 경우 사용한다
대량 데이터 조회 시 정렬이 필요한 경우 DB 레벨에서 처리하기 위해 ORDER BY 사용을 우선 고려한다
조회 후 추가 가공 또는 다양한 기준으로 재정렬이 필요한 경우 SORT 사용을 검토한다
BINARY SEARCH 수행 시에는 ORDER BY가 아닌 SORT를 사용해야 한다
ORDER BY와 SORT를 동일 기준으로 중복 사용하지 않는다
불필요한 ORDER BY 사용은 DB 부하를 증가시킬 수 있으므로 지양한다

