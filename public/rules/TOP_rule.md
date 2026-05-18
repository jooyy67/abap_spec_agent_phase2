\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

프로그램 기본 선언

\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

\[BLOCK: TOP\_PROGRAM]

use\_when: ALWAYS

output: TOP

purpose: 프로그램 시작 및 메시지 클래스 정의



\* 목적

프로그램 시작 및 메시지 클래스 정의



\* 예시

REPORT zxxx MESSAGE-ID zxxx.



\* 작성 규칙

\- REPORT 구문은 필수 선언이다

\- MESSAGE-ID는 표준 메시지 클래스를 사용한다

\- 프로그램명 및 메시지 클래스는 SPEC 기준으로 정의한다

\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

&#x20;Local Class DEFERRED 선언

\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

\[BLOCK: TOP\_LOCAL\_CLASS]

use\_when: EVENT\_CLASS = Y

output: TOP

purpose: Local Class 사전 참조 선언



\* 목적

Local Class를 사전 참조하기 위함



\* 예시

CLASS lcl\_event\_handler DEFINITION DEFERRED.



\* 작성 규칙

\- Local Class 사용 시에만 선언한다

\- 실제 클래스 정의 및 구현은 C01 Include에서 수행한다

\- TOP Include에 클래스 구현 작성 금지

\- Local Class를 사용하지 않는 경우 선언하지 않는다



\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

TABLES / CONTROLS 선언

\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

\[BLOCK: TOP\_TABLES\_CONTROLS]

use\_when: SCREEN\_FIELD = Y OR DYNPRO = Y

output: TOP

purpose: TABLES / CONTROLS 선언



\* 목적

ABAP Dictionary 테이블을 화면/모듈 처리와 연결하거나 Dynpro 제어 객체 선언



\* 예시

TABLES: bkpf, bseg, sscrfields.

CONTROLS tabstrip TYPE TABSTRIP.

CONTROLS tableview TYPE TABLEVIEW USING SCREEN '0100'.



\* 작성 규칙

\- 화면 연계 또는 표준 필드 참조 시에만 TABLES 선언

\- SELECT 대상이라는 이유로 선언 금지

\- Dynpro Tabstrip/Table Control이 SPEC에 있을 때만 CONTROLS 선언

\- ALV Custom Container만 쓰는 프로그램은 CONTROLS 선언하지 않는다

\- CONTROLS는 TOP Include에만 선언하고 S01/F01/C01/O01/I01에 선언하지 않는다

\- CONTROLS 구문에서 TYPE 뒤에는 ABAP 키워드 TABSTRIP 또는 TABLEVIEW만 올 수 있다

\- TYPE REF TO, DATA, TABLES, Dictionary 타입, 클래스/구조체 타입을 TYPE 뒤에 쓰지 않는다

\- TABLEVIEW는 USING SCREEN 'nnnn'을 함께 쓴다

\- 제어 객체명은 Dynpro Screen 정의와 1:1로 맞추고, go\_/gv\_ prefix를 쓰지 않는다

\- 여러 CONTROLS는 각각 한 줄로 선언하거나, 콜론 체인 시 모든 항목이 TYPE TABSTRIP 또는 TYPE TABLEVIEW ... 형태인지 확인한다

\- 사용하지 않는 선언 금지



\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

&#x20;**전역 객체 참조 변수 선언**

\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

\[BLOCK: TOP\_GLOBAL\_OBJECT]

use\_when: ALV = Y OR CONTAINER = Y OR EDITOR = Y

output: TOP

purpose: 전역 객체 참조 변수 선언



\* 목적

ALV, Container, Text Editor 등 화면 객체를 전역에서 재사용하기 위함



\* 예시 (필요한 경우 선택적으로 사용)



" 컨테이너 객체

DATA: go\_container  TYPE REF TO cl\_gui\_custom\_container,

&#x20;     go\_dock\_cont  TYPE REF TO cl\_gui\_docking\_container,

&#x20;     go\_split\_cont TYPE REF TO cl\_gui\_splitter\_container.



" ALV 객체

DATA: go\_alv\_grid TYPE REF TO cl\_gui\_alv\_grid.



" 이벤트 객체

DATA: go\_event TYPE REF TO lcl\_event\_handler.



" 텍스트 에디터 객체

DATA: go\_text\_edit TYPE REF TO cl\_gui\_textedit.



\* 작성 규칙

\- 객체 생성은 F01에서 수행한다

\- TOP에는 참조 변수만 선언한다

\- 재사용 객체만 전역 선언한다

\- 사용하지 않는 객체 선언 금지

\- 동일 객체 중복 선언 금지

\- 객체명은 go\_ prefix를 따른다

\- 선언은 SPEC 또는 화면 정의와 연결되어야 한다





\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

ALV 전용 속성 구조 선언

\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

\[BLOCK: TOP\_ALV\_ATTR]

use\_when: ALV = Y

output: TOP

purpose: ALV 관련 구조 선언



\* 목적

ALV 컬럼, 레이아웃, 정렬, 툴바 등을 제어하기 위함



\* 예시

DATA: gt\_fcat TYPE lvc\_t\_fcat,

&#x20;     gs\_fcat TYPE lvc\_s\_fcat,

&#x20;     gs\_layout TYPE lvc\_s\_layo,

&#x20;     gt\_sort TYPE lvc\_t\_sort,

&#x20;     gs\_sort TYPE lvc\_s\_sort,

&#x20;     gt\_uifunctions TYPE ui\_functions,

&#x20;     gs\_button TYPE stb\_button,

&#x20;     gs\_variant TYPE disvariant.



\* 작성 규칙

\- ALV 사용 시에만 선언한다

\- 필요한 구조만 선언한다

\- 사용하지 않는 ALV 구조 선언 금지

\- 필드카탈로그/레이아웃/정렬 정보는 SPEC 화면 정의와 일치해야 한다



\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

전역 구조체 및 Internal Table 선언

\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

\[BLOCK: TOP\_DATA\_ITAB]

use\_when: OUTPUT\_DATA = Y OR SAVE = Y

output: TOP

purpose: 전역 구조체 및 Internal Table 선언



\* 목적

전역 데이터 저장 및 ALV 출력 구조 정의



\* 예시

TYPES: BEGIN OF ty\_data,

&#x20;        bukrs   TYPE bkpf-bukrs,

&#x20;        belnr   TYPE bkpf-belnr,

&#x20;        gjahr   TYPE bkpf-gjahr,

&#x20;        status  TYPE char2,

&#x20;        celltab TYPE lvc\_t\_styl,

&#x20;        color   TYPE lvc\_t\_scol,

&#x20;        icon    TYPE icon-id,

&#x20;      END OF ty\_data.



DATA: gt\_data TYPE TABLE OF ty\_data,

&#x20;     gs\_data TYPE ty\_data.



DATA: gt\_scarr TYPE TABLE OF scarr,

&#x20;     gs\_open  TYPE LINE OF ztc3\_open\_26\_01.



DATA: gt\_messtab TYPE TABLE OF bdcmsgcoll WITH HEADER LINE.



\* 작성 규칙

\- SPEC에 정의된 필드만 사용한다

\- 필요한 경우에만 TYPES 구조를 정의한다

\- INCLUDE STRUCTURE 또는 LINE OF 활용 가능

\- ALV 제어 필드는 필요한 경우만 추가

\- Header Line 사용은 예외적으로만 허용







\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

&#x20;전역 변수 선언

\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

\[BLOCK: TOP\_GLOBAL\_VAR]

use\_when: ALWAYS

output: TOP

purpose: 전역 변수 선언



\* 목적

프로그램 상태, 화면 제어, 시스템 값 관리



\* 예시

DATA: gv\_okcode TYPE sy-ucomm,

&#x20;     gv\_tabix  TYPE sy-tabix,

&#x20;     gv\_dbcnt  TYPE sy-dbcnt,

&#x20;     gv\_subscreen TYPE sy-dynnr VALUE '0101',

&#x20;     gv\_tab TYPE sy-ucomm VALUE 'TAB1',

&#x20;     gv\_mode VALUE 'D'.



\* 작성 규칙

\- 필요한 변수만 선언한다

\- 임시 계산 변수는 지역 변수로 처리

\- TYPE 생략 지양 (명확한 타입 선언 권장)

\- 변수명은 gv\_ prefix를 따른다





\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

매크로 선언

\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*

\[BLOCK: TOP\_MACRO]

use\_when: NEED\_MACRO = Y

output: TOP

purpose: 매크로 선언



\* 목적

반복되는 초기화 및 Range 처리 간소화



\* 예시

DEFINE \_init.

&#x20; REFRESH \&1.

&#x20; CLEAR \&2.

END-OF-DEFINITION.



DEFINE \_ranges.

&#x20; \&1-sign   = \&2.

&#x20; \&1-option = \&3.

&#x20; \&1-low    = \&4.

&#x20; \&1-high   = \&5.

&#x20; APPEND \&1.

END-OF-DEFINITION.



\* 작성 규칙

\- 단순 반복 처리에만 사용

\- 비즈니스 로직 포함 금지

\- 매크로 남용 금지

