
*******************************************************************************
CREATE OBJECT 규칙
*******************************************************************************
[BLOCK: F01_CREATE_OBJECT]
use_when: ALV 또는 화면 객체 사용
output: F01
purpose: Container 및 ALV Grid 객체 생성

*목적
ALV 및 화면 객체 생성을 위함

*예시
CREATE OBJECT go_container
  EXPORTING
    container_name = 'CCON'.

CREATE OBJECT go_alv_grid
  EXPORTING
    i_parent = go_container.

*작성 규칙
객체 선언은 TOP에서 수행한다
객체 생성은 F01에서 수행한다
Container와 Grid 객체는 역할에 맞게 분리 생성한다
동일 객체를 중복 생성하지 않는다
객체 간 부모-자식 관계(Container - ALV Grid)를 유지한다
ALV Grid는 반드시 Container에 연결하여 생성한다

*******************************************************************************
CALL METHOD 규칙
*******************************************************************************
[BLOCK: F01_CALL_METHOD]
use_when: 객체 기능 호출 필요
output: F01
purpose: ALV 및 객체 기능 실행

*목적
객체 기반으로 기능을 호출하여 구조화된 프로그램을 구현하기 위함

*예시
CALL METHOD go_alv_grid->set_table_for_first_display
  CHANGING
    it_outtab = gt_data.

*작성 규칙
일반 메서드 호출은 ->(인스턴스 메서드)를 사용한다
객체는 반드시 CREATE OBJECT로 생성 후 메서드를 호출한다

메서드 호출 전 반드시 CREATE OBJECT로 객체를 생성해야 한다
객체가 생성되지 않은 상태에서 메서드 호출을 수행하지 않는다

EXPORTING / IMPORTING / CHANGING 파라미터를 명확히 구분하여 사용한다
메서드 호출 시 전달되는 데이터의 방향을 고려하여 작성한다

화면 출력, refresh, edit 제어 등 목적별로 메서드 호출을 분리한다
하나의 FORM에서 여러 역할의 메서드를 혼합하지 않는다

객체는 Container → ALV Grid와 같은 구조를 유지하여 사용한다
객체 간 관계를 고려하여 메서드를 호출한다
단, 이벤트 처리 관련 메서드는 static 메서드(=>) 사용을 허용한다

*******************************************************************************
 ALV 최초 출력 규칙
*******************************************************************************
[BLOCK: F01_ALV_DISPLAY]
use_when: ALV 출력
output: F01
purpose: ALV 최초 화면 출력

*목적
ALV 데이터를 최초로 화면에 출력하기 위함

*예시
CALL METHOD go_alv_grid->set_table_for_first_display
  EXPORTING
    is_layout       = gs_layout
    is_variant      = gs_variant
    i_save          = 'A'
  CHANGING
    it_outtab       = gt_data
    it_fieldcatalog = gt_fcat
    it_sort         = gt_sort.

*작성 규칙
최초 출력은 set_table_for_first_display로 수행한다
최초 출력 시 layout, fieldcatalog, sort, variant를 함께 전달한다
최초 출력 로직은 display FORM에서만 수행한다
최초 출력과 refresh 로직은 분리한다
단순 출력이 아닌 구조화된 호출 형태로 작성한다

*******************************************************************************
ALV 필드카탈로그 규칙
*******************************************************************************
[BLOCK: F01_FIELDCATALOG]
use_when: ALV 컬럼 정의 필요
output: F01
purpose: ALV 컬럼 구조 정의

*목적
ALV 컬럼의 출력 형태, 정렬, 입력 가능 여부 및 필드별 속성을 일관되게 정의하기 위함

*예시
FORM set_fcat USING pv_key
                    pv_field
                    pv_coltext
                    pv_ref_table
                    pv_ref_field.

  CLEAR gs_fcat.

  gs_fcat-key        = pv_key.
  gs_fcat-fieldname  = pv_field.
  gs_fcat-coltext    = pv_coltext.
  gs_fcat-ref_table  = pv_ref_table.
  gs_fcat-ref_field  = pv_ref_field.

  CASE pv_field.
    WHEN 'PSMNG'.
      gs_fcat-qfieldname = 'AMEIN'.   " 수량 단위
    WHEN 'AMOUNT'.
      gs_fcat-cfieldname = 'WAERS'.   " 통화
  ENDCASE.

  APPEND gs_fcat TO gt_fcat.

ENDFORM.

*작성 규칙
필요한 컬럼만 필드카탈로그에 정의한다
SELECT 조회 필드와 필드카탈로그 필드는 일관되게 유지한다

key 필드는 기준 컬럼으로 지정하여 정렬 및 그룹 기준으로 활용한다

반복되는 필드카탈로그 세팅은 set_fcat FORM으로 분리한다
공통 속성은 USING 파라미터로 전달하여 설정한다

필드별 특수 속성(통화, 수량 등)은 CASE pv_field 구문으로 분기 처리한다
필드 추가 시 CASE 구문도 함께 수정하여 유지보수성을 확보한다

APPEND 후 CLEAR 구조를 유지하여 이전 값이 남지 않도록 한다
필드 순서는 APPEND 순서 기준으로 정렬되므로 순서를 고려하여 작성한다

출력 목적에 맞지 않는 불필요한 속성은 선언하지 않는다

*******************************************************************************
ALV 필드 속성 확장 규칙
*******************************************************************************
[BLOCK: F01_FCAT_OPTION]
use_when: ALV 컬럼 속성 제어
output: F01
purpose: hotspot / checkbox / edit 등 설정

*목적
컬럼별 동작(클릭, 수정, 체크, 단위 등)을 세부적으로 제어하기 위C함

*예시
gs_fcat-hotspot    = abap_true.
gs_fcat-checkbox   = abap_true.
gs_fcat-edit       = abap_true.
gs_fcat-cfieldname = 'WAERS'.
gs_fcat-qfieldname = 'GEWEI'.
gs_fcat-just       = 'R'.

*작성 규칙
핫스팟(hotspot)은 클릭 이벤트 처리가 필요한 필드에 사용한다
checkbox는 선택 여부(행 선택, 처리 대상 표시)에 사용한다
edit는 수정 가능한 ALV에서만 설정하며, 모드값과 일관되게 관리한다

금액 필드는 cfieldname(통화 필드)와 함께 설정한다
수량 필드는 qfieldname(단위 필드)와 함께 설정한다
통화/단위 필드가 없는 경우 표시 오류가 발생할 수 있으므로 반드시 매핑한다

정렬 방향(just)은 숫자(R), 문자(L) 기준으로 설정한다
강조 표시가 필요한 경우 emphasize 또는 color/celltab과 함께 사용한다

핫스팟, 체크박스, 수정 가능 필드는 동시에 사용할 경우 충돌 여부를 고려한다
필드 속성은 화면 목적(조회/수정/선택)에 맞게 최소한으로 설정한다

ALV edit, celltab, layout(stylefname)과 설정이 일관되도록 관리한다

*******************************************************************************
 ALV 레이아웃 규칙
*******************************************************************************
[BLOCK: F01_LAYOUT]
use_when: ALV 출력
output: F01
purpose: zebra, width, selection 등 화면 설정
*목적
ALV 출력 형태를 일관되게 제어하기 위함

*예시
gs_layout-zebra      = abap_true.
gs_layout-cwidth_opt = 'A'.
gs_layout-sel_mode   = 'D'.

*작성 규칙
ALV 출력 전 layout을 별도 FORM에서 설정한다
zebra, cwidth_opt, sel_mode 등 공통 속성은 layout에서 관리한다
필요 시 grid_title, totals_bef, stylefname, ctab_fname 등을 추가 설정한다
layout 속성은 출력 목적에 맞게 최소한으로 사용한다

*******************************************************************************
 ALV Variant 규칙
*******************************************************************************
use_when: ALV 사용자 저장 기능
output: F01
purpose: 사용자 레이아웃 저장/불러오기

*목적
사용자별 컬럼 레이아웃 저장 및 재사용을 위함

*예시
gs_variant-report = sy-repid.
gs_variant-handle = 'ALV1'.

CALL METHOD go_alv_grid->set_table_for_first_display
  EXPORTING
    is_variant = gs_variant
    i_save     = 'A'
    i_default  = 'X'.

*작성 규칙
Variant 사용 시 report 정보는 반드시 sy-repid로 세팅한다
복수 ALV 사용 시 handle 값을 구분하여 관리한다
사용자 저장 가능 여부는 i_save로 제어한다
기본 Variant 적용 여부는 i_default로 제어한다

*******************************************************************************
 ALV 정렬 / 소계 규칙
*******************************************************************************
[BLOCK: F01_SORT]
use_when: 정렬 또는 소계 필요
output: F01
purpose: ALV 정렬 및 소계 처리

*목적
출력 데이터의 정렬 및 소계 표시를 위함

*예시
gs_sort-spos      = 1.
gs_sort-fieldname = 'CARRID'.
gs_sort-up        = abap_true.
gs_sort-subtot    = abap_true.
APPEND gs_sort TO gt_sort.

*작성 규칙
정렬 및 소계가 필요한 경우 sort 테이블을 별도 구성한다
정렬 순서는 spos로 관리한다

소계를 표시할 기준 필드는 subtot = 'X'로 설정한다
합계가 필요한 컬럼은 fieldcatalog의 do_sum = 'X'로 설정한다
통화/단위 없이 do_sum 설정은 지양한다
sort 정보(gt_sort)는 set_table_for_first_display 호출 시 it_sort로 전달한다
합계/소계는 ALV 화면에서만 생성되며 내부테이블 데이터에는 영향을 주지 않는다
합계 위치는 layout-totals_bef로 제어하고, 총계 숨김은 layout-no_totline으로 설정한다.

*******************************************************************************
ALV 색상 / 아이콘 규칙
*******************************************************************************
[BLOCK: F01_COLOR]
use_when: 상태 표시 필요
output: F01
purpose: 행/셀 색상 및 아이콘 표시

*목적
행 상태 및 중요 정보를 시각적으로 구분하고, 사용자 인지성을 향상시키기 위함

*예시
gs_data-icon = icon_led_green.

DATA: ls_scol TYPE lvc_s_scol.

ls_scol-fname      = 'PASSNAME'.
ls_scol-color-col  = 3.
ls_scol-color-int  = 1.

INSERT ls_scol INTO TABLE gs_data-color.

gs_layout-ctab_fname = 'COLOR'.

MODIFY gt_data FROM gs_data INDEX sy-tabix
                             TRANSPORTING icon color.

*작성 규칙
상태 표시는 icon 필드를 사용하여 시각적으로 구분한다
행/셀 색상은 lvc_s_scol 구조를 사용하여 color 테이블에 설정한다

색상 적용을 위해 layout의 ctab_fname을 반드시 설정한다
(예: gs_layout-ctab_fname = 'COLOR')

아이콘 및 색상 필드는 출력 구조(Internal Table)에 사전 정의되어 있어야 한다
색상 정보는 컬럼 단위(fname 기준)로 관리한다

데이터 가공 후 MODIFY ... TRANSPORTING icon color로 반영한다
색상은 강조, 오류, 상태 표시 등 의미 있는 경우에만 사용한다
불필요한 색상 남용은 지양한다

*******************************************************************************
ALV CELLTAB / 스타일 제어 규칙
*******************************************************************************
[BLOCK: F01_CELLTAB]
use_when: 셀 단위 제어 필요
output: F01
purpose: 입력 가능/불가 등 셀 제어

*목적
셀 단위 동작(수정 가능 여부, 입력 제한 등)을 제어하기 위함

*예시
DATA: ls_style TYPE lvc_s_styl.

ls_style-fieldname = 'AMOUNT'.
ls_style-style     = cl_gui_alv_grid=>mc_style_enabled.

INSERT ls_style INTO TABLE gs_data-celltab.

MODIFY gt_data FROM gs_data INDEX sy-tabix
                             TRANSPORTING celltab.

*작성 규칙
셀 단위 동작 제어는 lvc_s_styl 구조를 사용하여 celltab에 설정한다

celltab은 수정 가능/불가, 입력 제어 등 동작 제어에 사용한다
색상 제어는 celltab이 아닌 color(lvc_s_scol)를 사용한다

MODIFY 시 TRANSPORTING celltab을 명시하여 해당 필드만 갱신한다
layout의 stylefname과 celltab 필드명을 일관되게 유지한다

필드카탈로그(edit), layout(stylefname), celltab 설정은 서로 일관되게 관리한다
celltab과 color는 목적이 다르므로 혼용하지 않고 역할을 구분하여 사용한다

*******************************************************************************
ALV 이벤트 등록 규칙
*******************************************************************************
[BLOCK: F01_EVENT]
use_when: ALV 이벤트 존재
output: F01
purpose: 더블클릭, 핫스팟, 데이터변경 처리 등록

*목적
더블클릭, 핫스팟, 데이터 변경 등 사용자 이벤트를 처리하기 위함

*예시
DATA: go_handler TYPE REF TO lcl_event_handler.

CREATE OBJECT go_handler.

SET HANDLER:
  lcl_event_handler=>double_click   FOR go_alv_grid,
  lcl_event_handler=>hotspot_click  FOR go_alv_grid,
  lcl_event_handler=>data_changed   FOR go_alv_grid.

*작성 규칙
*작성 규칙
ALV 이벤트는 SET HANDLER 구문을 사용하여 등록한다

이벤트 메서드는 static 메서드(=>)로 정의하여 사용한다
이벤트 처리 로직은 별도 이벤트 클래스에서 관리한다

double_click, hotspot_click, data_changed, toolbar, user_command등 필요한 이벤트만 등록한다

이벤트 등록은 ALV Grid 객체 생성 직후 수행한다
ALV 출력(set_table_for_first_display) 이전에 등록하는 것을 원칙으로 한다

데이터 변경 이벤트 사용 시 register_edit_event 호출 여부를 함께 검토한다

*******************************************************************************
ALV Toolbar 제어 규칙
*******************************************************************************
[BLOCK: F01_TOOLBAR]
use_when: 사용자 버튼 필요
output: F01
purpose: ALV 툴바 제어 및 버튼 추가

*목적
기본 툴바 버튼을 제외하고 사용자 정의 버튼을 추가하기 위함

*예시
PERFORM exclude_button CHANGING gt_uifunctions.

FORM exclude_button CHANGING pt_ui_functions TYPE ui_functions.

  DATA ls_ui_functions TYPE ui_func.

  CLEAR pt_ui_functions.

  ls_ui_functions = cl_gui_alv_grid=>mc_fc_loc_undo.
  APPEND ls_ui_functions TO pt_ui_functions.

  ls_ui_functions = cl_gui_alv_grid=>mc_fc_loc_copy.
  APPEND ls_ui_functions TO pt_ui_functions.

  ls_ui_functions = cl_gui_alv_grid=>mc_fc_loc_delete_row.
  APPEND ls_ui_functions TO pt_ui_functions.

  ls_ui_functions = cl_gui_alv_grid=>mc_fc_refresh.
  APPEND ls_ui_functions TO pt_ui_functions.

ENDFORM.

CALL METHOD go_alv_grid->set_table_for_first_display
  EXPORTING
    it_toolbar_excluding = gt_uifunctions.

*-- Toolbar 이벤트 내
gs_button-function  = 'IROW'.
gs_button-icon      = icon_insert_row.
gs_button-text      = '행추가'.
APPEND gs_button TO po_object->mt_toolbar.

*작성 규칙
기본 버튼 제외는 toolbar excluding 방식으로 처리한다
제외 대상 버튼은 ui_functions 테이블로 관리한다
cl_gui_alv_grid 상수를 사용하여 기능코드를 정의한다

FORM 파라미터는 TABLES 대신 CHANGING을 사용한다
내부테이블은 CHANGING으로 전달하여 수정한다

사용자 버튼은 toolbar 이벤트에서 po_object->mt_toolbar에 추가한다
버튼 기능코드는 PAI 또는 user_command 처리와 반드시 일치해야 한다

조회모드, 수정모드, 권한에 따라 버튼 활성 여부를 제어할 수 있다
표준 버튼 제외와 사용자 버튼 추가 로직은 분리하여 관리한다

*******************************************************************************
ALV 편집 가능 상태 규칙
*******************************************************************************
[BLOCK: F01_EDIT]
use_when: ALV 수정 가능
output: F01
purpose: ALV 입력 가능 상태 설정

*목적
ALV 수정모드 및 입력 가능 상태를 제어하기 위함

*예시
CALL METHOD go_alv_grid->set_ready_for_input
  EXPORTING
    i_ready_for_input = 1.

CALL METHOD go_alv_grid->register_edit_event
  EXPORTING
    i_event_id = cl_gui_alv_grid=>mc_evt_modified.

*작성 규칙
수정 가능한 ALV는 set_ready_for_input으로 입력 가능 상태를 설정한다
데이터 변경 이벤트가 필요한 경우 register_edit_event를 함께 등록한다

register_edit_event는 ALV에서 셀 값 변경을 감지하기 위해 사용한다
해당 설정이 없을 경우 data_changed 이벤트가 발생하지 않는다
편집 ALV에서는 set_ready_for_input과 함께 반드시 설정한다

edit 필드카탈로그, stylefname, celltab 설정과 일관되게 구성한다
편집 ALV는 저장 전 변경 데이터 반영 여부를 반드시 확인한다


*******************************************************************************
ALV 데이터 변경 이벤트 규칙
*******************************************************************************
[BLOCK: F01_DATA_CHANGED]
use_when: ALV 수정 기능 존재
output: F01
purpose: 입력값 검증 및 후처리

*목적
ALV에서 사용자가 입력한 데이터를 단계별로 감지, 검증, 확정 처리하기 위함

*예시
SET HANDLER:
  lcl_event_handler=>data_changed           FOR go_alv_grid,
  lcl_event_handler=>data_changed_finished  FOR go_alv_grid.

CALL METHOD go_alv_grid->register_edit_event
  EXPORTING
    i_event_id = cl_gui_alv_grid=>mc_evt_modified.

" 저장 전
CALL METHOD go_alv_grid->check_changed_data.

*작성 규칙
ALV 데이터 변경 처리는 DATA_CHANGED, DATA_CHANGED_FINISHED, CHECK_CHANGED_DATA의 3단계로 구성한다

DATA_CHANGED 이벤트는 사용자가 셀 값을 수정하는 중에 발생하며,
입력값 검증, 오류 처리, 입력 제한 등의 실시간 처리에 사용한다

DATA_CHANGED_FINISHED 이벤트는 사용자가 입력을 완료(Enter, 포커스 이동)한 후 발생하며,
계산, 합계 반영, 연관 필드 자동 세팅 등의 후처리에 사용한다

두 이벤트 모두 내부테이블 최종 반영을 보장하지 않으며,
변경 데이터는 화면에만 존재할 수 있다

저장 전에는 반드시 CHECK_CHANGED_DATA를 호출하여
화면의 변경 내용을 내부테이블에 최종 반영한다

DATA_CHANGED 및 DATA_CHANGED_FINISHED 이벤트 사용 여부와 관계없이
저장 직전에는 CHECK_CHANGED_DATA를 필수로 수행한다

데이터 처리 흐름은 다음과 같이 구성한다
  1. DATA_CHANGED (입력 중 검증)
  2. DATA_CHANGED_FINISHED (입력 완료 후 처리)
  3. CHECK_CHANGED_DATA (최종 반영)

이벤트는 “변경 감지 및 처리”,
CHECK_CHANGED_DATA는 “데이터 확정” 역할로 구분하여 사용한다

*******************************************************************************
 ALV Refresh 규칙
*******************************************************************************
[BLOCK: F01_REFRESH]
use_when: 데이터 변경 발생
output: F01
purpose: ALV 화면 갱신

*목적
데이터 변경 후 ALV 화면을 갱신하기 위함

*예시
CALL METHOD go_alv_grid->refresh_table_display.

*작성 규칙
초기 출력 이후 데이터 변경 시 refresh_table_display를 사용한다
조회, 저장, 삭제, 행추가 이후 refresh 여부를 검토한다
최초 출력과 refresh 로직은 분리한다
불필요한 반복 refresh는 지양한다
