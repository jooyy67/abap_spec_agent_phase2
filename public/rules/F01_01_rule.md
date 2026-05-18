*******************************************************************************
F01 Include - 구조
*******************************************************************************
[FILE: F01_01_STRUCTURE]
include: F01
category: 구조
use_when: ALWAYS
purpose: FORM 구조 및 파라미터 전달 규칙 정의

*******************************************************************************
 FORM / PERFORM 규칙
*******************************************************************************
[BLOCK: F01_FORM_PERFORM]
use_when: ALWAYS
output: F01
purpose: 로직 구조 분리 및 호출 규칙

*목적
로직을 기능 단위로 분리하고 재사용하기 위함

*예시
FORM get_data.

PERFORM select_data.
PERFORM make_display_data.
ENDFORM.

PERFORM get_data.

*작성 규칙
실제 로직은 FORM으로 분리한다
호출은 PERFORM으로 수행한다
조회 / 가공 / 저장 / 검증 등 역할별로 FORM을 나눈다
하나의 FORM에 과도한 로직을 몰아넣지 않는다
FORM명은 get_, set_, check_, save_, display_ 형태로 목적이 드러나게 작성한다
O01 / I01에서는 호출만 하고 실제 로직은 F01에서 처리한다.
 
*******************************************************************************
 USING / CHANGING 규칙
*******************************************************************************
[BLOCK: F01_PARAM_PASS]
use_when: HAS_PARAM = Y
output: F01
purpose: FORM 간 파라미터 전달


*목적
FORM 간 입력값 전달 및 결과값 반환을 명확히 하기 위함

*예시
FORM check_value USING pv_bukrs TYPE bkpf-bukrs
                           CHANGING pv_valid TYPE abap_bool.

  IF pv_bukrs IS INITIAL.
    pv_valid = abap_false.
  ELSE.
    pv_valid = abap_true.
  ENDIF.

ENDFORM.

*작성 규칙
입력값은 USING 사용
결과값 반환은 CHANGING 사용
전역변수 직접 참조보다 파라미터 전달을 우선 사용한다
파라미터 타입은 명확하게 선언한다
여러 값을 반환해야 할 경우 CHANGING을 사용한다
내부테이블 전달 시 필요하지 않으면 TABLES 사용은 지양한다

*******************************************************************************
VALUE 파라미터 규칙 (Call by value)
*******************************************************************************
[BLOCK: F01_VALUE_PARAM]
use_when: NEED_VALUE = Y
output: F01
purpose: 입력값 보호 처리


*목적
FORM 내부에서 원본 값을 변경하지 않도록 하기 위함

*예시
FORM calcul_multiply  USING VALUE(pv_a)
                                         VALUE(pv_b)
                                         CHANGING pv_c.

  pv_c = pv_a * pv_b.

ENDFORM.

*작성 규칙
입력값 보호가 필요할 때 VALUE 사용
VALUE 파라미터는 FORM 내부에서 변경해도 원본에 영향 없음
계산용 파라미터에 주로 사용
일반 입력값은 USING, 보호 필요 시 VALUE 사용

*******************************************************************************
 TABLES 파라미터 규칙
*******************************************************************************
[BLOCK: F01_TABLES_PARAM]
use_when: NEED_TABLES = Y
output: F01
purpose: 내부테이블 전달


*목적
내부테이블을 FORM 간 전달하기 위함

*예시
FORM change_data  TABLES   pt_bkpf STRUCTURE bkpf
                                          pt_data STRUCTURE gs_data
                                           USING  pv_bukrs
                                           CHANGING pv_result.
 
  LOOP AT pt_bkpf.
  ENDLOOP.

ENDFORM.

*작성 규칙
내부테이블 전달 시 TABLES 사용 가능
구조 타입을 명확히 지정한다
TABLES → USING → CHANGING 순서 유지
신규 개발에서는 USING / CHANGING 방식 우선 고려

*******************************************************************************
 DATA / CLEAR 규칙
*******************************************************************************
[BLOCK: F01_DATA_CLEAR]
use_when: ALWAYS
output: F01
purpose: 지역 변수 선언 및 초기화

*목적
지역 변수 및 작업용 데이터를 선언하고 초기화하기 위함

*예시
FORM make_data.

  DATA: ls_data TYPE ty_data,
           lv_tabix TYPE sy-tabix.

  CLEAR ls_data.

ENDFORM.

*작성 규칙
임시 변수는 FORM 내부에서 선언한다
반복 처리 전 work area는 CLEAR 한다
이전 값이 남으면 안 되는 구조체는 사용 전 CLEAR 한다
전역 선언은 TOP, 일회성 변수는 F01 PERFORM문 안에서 선언한다

 