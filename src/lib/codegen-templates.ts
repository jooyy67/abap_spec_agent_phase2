import { readFile } from "node:fs/promises";
import path from "node:path";

export const CODE_SPEC_TEMPLATE_MD = `# Code Template Specification

---

## 템플릿 운영 원칙

- TEMPLATE_ID는 BLOCK_ID 기준으로 TPL_ 접두어를 붙여 생성한다.
- 템플릿은 공통 코드 틀만 포함한다.
- 실제 값은 {placeholder} 형태로 AI가 치환한다.
- 하나의 BLOCK_ID는 기본적으로 하나의 TEMPLATE_ID를 가진다.
- 필요 시 세부 유형으로 확장 가능하다.

예:
- TPL_F01_SAVE_DB_DATA_MODIFY
- TPL_F01_SAVE_DB_DATA_INSERT
- TPL_F01_SELECT_JOIN

---

## TOP

### TPL_TOP_PROGRAM

    REPORT {program_id} MESSAGE-ID {message_class}.

### TPL_TOP_LOCAL_CLASS

    CLASS {local_class_name} DEFINITION DEFERRED.

### TPL_TOP_TABLES_CONTROLS

    TABLES: {tables_list}.
    CONTROLS: {control_name} TYPE TABSTRIP.

### TPL_TOP_GLOBAL_OBJECT

    DATA: go_container TYPE REF TO cl_gui_custom_container,
          go_alv_grid TYPE REF TO cl_gui_alv_grid,
          go_event TYPE REF TO {local_class_name}.

### TPL_TOP_ALV_ATTR

    DATA: gt_fcat TYPE lvc_t_fcat,
          gs_fcat TYPE lvc_s_fcat,
          gs_layout TYPE lvc_s_layo,
          gt_sort TYPE lvc_t_sort,
          gs_sort TYPE lvc_s_sort,
          gt_uifunctions TYPE ui_functions,
          gs_variant TYPE disvariant.

### TPL_TOP_DATA_ITAB

    TYPES: BEGIN OF {ty_data},
    {field_lines}
    END OF {ty_data}.

    DATA: gt_data TYPE TABLE OF {ty_data},
          gs_data TYPE {ty_data}.

    DATA: gt_save TYPE TABLE OF {save_type},
          gs_save TYPE {save_type}.

### TPL_TOP_GLOBAL_VAR

    DATA: gv_okcode TYPE sy-ucomm,
          gv_mode TYPE c LENGTH 1,
          gv_tabix TYPE sy-tabix.

### TPL_TOP_MACRO

    DEFINE _init.
      REFRESH &1.
      CLEAR &2.
    END-OF-DEFINITION.

---

## S01

### TPL_S01_BASE

    SELECTION-SCREEN BEGIN OF BLOCK {block_name} WITH FRAME TITLE text-{title_no}.
    SELECTION-SCREEN END OF BLOCK {block_name}.

### TPL_S01_PARAMETERS

    PARAMETERS: p_{field_id} TYPE {ddic_type} {obligatory}.

### TPL_S01_SELECT_OPTIONS

    SELECT-OPTIONS: s_{field_id} FOR {ref_field}.

### TPL_S01_SELECTION_UI

    PARAMETERS: p_{radio1} RADIOBUTTON GROUP {group},
                p_{radio2} RADIOBUTTON GROUP {group},
                p_{check} AS CHECKBOX.

### TPL_S01_SEARCH_HELP

    AT SELECTION-SCREEN ON VALUE-REQUEST FOR {field_name}.
    PERFORM {f4_form}.

### TPL_S01_LAYOUT

    SELECTION-SCREEN SKIP.
    SELECTION-SCREEN ULINE.

### TPL_S01_MODIF

    LOOP AT SCREEN.
      IF screen-group1 = '{modif_id}'.
        screen-input = 0.
        MODIFY SCREEN.
      ENDIF.
    ENDLOOP.

---

## C01

### TPL_C01_CLASS_DEF

    CLASS {local_class_name} DEFINITION.
      PUBLIC SECTION.
        CLASS-METHODS:
          hotspot_click FOR EVENT hotspot_click OF cl_gui_alv_grid
            IMPORTING e_row_id e_column_id.
    ENDCLASS.

### TPL_C01_CLASS_IMPL

    CLASS {local_class_name} IMPLEMENTATION.
      METHOD hotspot_click.
        PERFORM {delegate_form} USING e_row_id e_column_id.
      ENDMETHOD.
    ENDCLASS.

---

## O01

### TPL_O01_BASE

    MODULE status_0100 OUTPUT.
      PERFORM set_status.
      PERFORM init_screen.
    ENDMODULE.

---

## I01

### TPL_I01_BASE

    MODULE user_command_0100 INPUT.
      gv_okcode = sy-ucomm.
      CLEAR sy-ucomm.
      PERFORM user_command USING gv_okcode.
    ENDMODULE.

---

## F01_03 조회

### TPL_F01_SELECT

    FORM {form_name}.
      CLEAR gt_data.
      SELECT {select_fields}
        INTO CORRESPONDING FIELDS OF TABLE @gt_data
        FROM {from_table}
        WHERE {where_clause}
        {order_by_clause}.
    ENDFORM.

---

## F01_04 데이터 처리

### TPL_F01_LOOP

    FORM {form_name}.
      LOOP AT gt_data INTO gs_data.
        {process_logic}
        MODIFY gt_data FROM gs_data INDEX sy-tabix TRANSPORTING {transport_fields}.
      ENDLOOP.
    ENDFORM.

---

## F01_05 ALV

### TPL_F01_ALV_DISPLAY

    FORM display_alv.
      CALL METHOD go_alv_grid->set_table_for_first_display
        EXPORTING
          is_layout = gs_layout
          is_variant = gs_variant
          i_save = 'A'
        CHANGING
          it_outtab = gt_data
          it_fieldcatalog = gt_fcat
          it_sort = gt_sort.
    ENDFORM.

---

## F01_06 저장

### TPL_F01_SAVE_FLOW

    FORM save_data.
      CALL METHOD go_alv_grid->check_changed_data.
      PERFORM check_data.
      PERFORM make_save_data.
      PERFORM save_db_data.
      PERFORM after_save.
    ENDFORM.

### TPL_F01_SAVE_DB_DATA

    FORM save_db_data.
      MODIFY {save_table} FROM TABLE gt_save.
      IF sy-subrc = 0.
        COMMIT WORK.
      ELSE.
        ROLLBACK WORK.
        MESSAGE s000 WITH '저장 중 오류가 발생했습니다.' DISPLAY LIKE 'E'.
        RETURN.
      ENDIF.
    ENDFORM.
`;

export const INCLUDE_MAPPING_SPEC_MD = `# Include Mapping Specification

---

## 1. 문서 개요

### 1.1 목적
본 문서는 프로그램 생성 시 표준 BLOCK_ID를 어떤 Include에 배치할지,  
각 Include 내에서 어떤 FORM / CLASS / 선언 형태로 구현할지 정의한다.

---

### 1.2 적용 범위

- TOP Include  
- S01 Include  
- C01 Include  
- O01 Include  
- I01 Include  
- F01 Include  

---

### 1.3 생성 기준

- 사용자 요구사항 입력서  
- Functional Spec  
- 세부 기능 리스트  
- 개발 매핑 입력서  
- 표준 BLOCK 목록  
- 코드 템플릿(TPL)  

---

## 2. 프로그램 기본 정보

- Program ID  
- Program Name  
- Message Class  
- Main Screen No : 0100  

---

## 3. Include 구성

| Include ID | Include 명 | 역할 | 생성 여부 |
|------------|-----------|------|-----------|
| TOP | 전역 선언 | 프로그램 선언 | Y |
| S01 | Selection Screen | 조회조건 | Y/N |
| C01 | 이벤트 클래스 | 이벤트 처리 | Y/N |
| O01 | PBO 처리 | 화면 출력 | Y/N |
| I01 | PAI 처리 | 사용자 입력 처리 | Y/N |
| F01_01 | 구조 | FORM 규칙 | Y/N |
| F01_02 | 제어 | 흐름 제어 | Y/N |
| F01_03 | 조회 | DB 조회 | Y/N |
| F01_04 | 데이터 처리 | 가공 처리 | Y/N |
| F01_05 | ALV 출력 | 출력 처리 | Y/N |
| F01_06 | 저장/메시지 | 저장 처리 | Y/N |

---

## 4. TOP Include 매핑

| BLOCK_ID | Include | 선언 대상 | 생성 항목 | TEMPLATE_ID |
|----------|---------|----------|----------|-------------|
| TOP_PROGRAM | TOP | 프로그램 선언 | REPORT / MESSAGE-ID | TPL_TOP_PROGRAM |

---

## 5. S01 Include 매핑

| BLOCK_ID | Include | 대상 | 생성 항목 | TEMPLATE_ID |
|----------|---------|------|----------|-------------|
| S01_BASE | S01 | Selection Screen | SELECTION-SCREEN BEGIN/END | TPL_S01_BASE |
| S01_BLOCK | S01 | 화면 블록 | BLOCK 단위 구성 | TPL_S01_BLOCK |
| S01_PARAMETERS | S01 | 단일 입력 | PARAMETERS | TPL_S01_PARAMETERS |
| S01_SELECT_OPTIONS | S01 | 범위 입력 | SELECT-OPTIONS | TPL_S01_SELECT_OPTIONS |
| S01_SELECTION_UI | S01 | 선택형 입력 | RADIO / CHECKBOX / LISTBOX | TPL_S01_SELECTION_UI |
| S01_SEARCH_HELP | S01 | F4 도움말 | SEARCH HELP | TPL_S01_SEARCH_HELP |
| S01_LAYOUT | S01 | 화면 정리 | SKIP / ULINE | TPL_S01_LAYOUT |
| S01_MODIF | S01 | 동적 제어 | MODIF ID / SCREEN | TPL_S01_MODIF |

---

## 6. C01 Include 매핑

| BLOCK_ID | Include | 대상 | 생성 항목 | TEMPLATE_ID |
|----------|---------|------|----------|-------------|
| C01_BASE | C01 | 클래스 기본 | Local Class 구조 | TPL_C01_BASE |
| C01_METHOD_NAMING | C01 | 메서드 규칙 | 이벤트 명명 | TPL_C01_METHOD_NAMING |
| C01_CLASS_DEF | C01 | 클래스 정의 | CLASS DEFINITION | TPL_C01_CLASS_DEF |
| C01_CLASS_IMPL | C01 | 클래스 구현 | CLASS IMPLEMENTATION | TPL_C01_CLASS_IMPL |
| C01_DELEGATION | C01 | 위임 처리 | METHOD → PERFORM | TPL_C01_DELEGATION |

---

## 7. O01 Include 매핑

| BLOCK_ID | Include | FORM 명 | 생성 항목 | TEMPLATE_ID |
|----------|---------|--------|----------|-------------|
| O01_BASE | O01 | STATUS_0100 / PBO_0100 | PBO 기본 구조 | TPL_O01_BASE |
| O01_STATUS | O01 | SET_STATUS | PF-STATUS / TITLEBAR | TPL_O01_STATUS |
| O01_EXCLUDING | O01 | EXCLUDE_BUTTON | 버튼 제외 처리 | TPL_O01_EXCLUDING |

---

## 8. I01 Include 매핑

| BLOCK_ID | Include | FORM 명 | 생성 항목 | TEMPLATE_ID |
|----------|---------|--------|----------|-------------|
| I01_BASE | I01 | USER_COMMAND_0100 | PAI 기본 구조 | TPL_I01_BASE |
| I01_EXIT | I01 | EXIT_0100 | 종료 처리 | TPL_I01_EXIT |
| I01_COMMAND | I01 | USER_COMMAND_0100 | OK_CODE CASE 분기 | TPL_I01_COMMAND |
| I01_TAB | I01 | TAB_CONTROL | 탭 처리 | TPL_I01_TAB |

---

## 9. F01 Include 매핑

### 9.1 F01_01 구조

| BLOCK_ID | Include | 생성 항목 | TEMPLATE_ID |
|----------|---------|----------|-------------|
| F01_FORM_PERFORM | F01_01 | FORM / PERFORM 구조 | TPL_F01_FORM_PERFORM |

---

### 9.2 F01_02 제어

- SET_INIT_VALUE
- BRANCH_LOGIC (IF / CASE)
- FLOW_CONTROL (CHECK / EXIT / RETURN)
- STOP_PROCESS
- LEAVE_LIST

---

### 9.3 F01_03 조회

- SELECT_DATA
- SELECT_SINGLE_DATA
- ORDER BY 처리

---

### 9.4 F01_04 데이터 처리

- LOOP 가공
- SORT 처리
- MODIFY / APPEND / DELETE

---

### 9.5 F01_05 ALV

- CREATE_OBJECT
- DISPLAY_ALV
- SET_FIELDCATALOG
- SET_LAYOUT
- SET_SORT / SUBTOTAL
- EVENT 처리

---

### 9.6 F01_06 저장/메시지

- CHECK_DATA
- SAVE_DATA
- SAVE_DB_DATA
- AFTER_SAVE
- MESSAGE 처리

---

## 10. 기능 ID → BLOCK 매핑

| 기능 ID | 필수 BLOCK |
|--------|-----------|
| SCR_01 | S01_MODIF |
| ALV_01 | F01_EVENT |
| EVT_01 | F01_DATA_CHANGED |
| SAV_01 | F01_SAVE_FLOW |
| SAV_03 | F01_SAVE_DB_DATA |
| ALV_02 | F01_SORT_SUBTOTAL |
| ALV_03 | F01_COLOR_ICON |
| EXT_01 | F01_DOWNLOAD / F01_UPLOAD |

---

## 11. 코드 생성 순서

1. TOP  
2. S01  
3. C01  
4. O01  
5. I01  
6. F01_01  
7. F01_02  
8. F01_03  
9. F01_04  
10. F01_05  
11. F01_06  

---

## 12. 생성 조건 / 비고

- 조회 전용 프로그램은 저장 관련 BLOCK 생성하지 않음  
- ALV 미사용 시 ALV 관련 BLOCK 생성하지 않음  
- 이벤트 미사용 시 클래스 생성하지 않음  
- 팝업/탭 구조 사용 시 O01 / I01 추가 생성  
- 업로드 기능 사용 시 검증 BLOCK 함께 생성  
`;

function normalizeMarkdownNewlines(markdown: string): string {
  return markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function extractMarkdownSection(
  markdown: string,
  startHeading: string,
  endHeading?: string,
): string {
  const body = normalizeMarkdownNewlines(markdown);
  const start = body.indexOf(startHeading);
  if (start < 0) return "";
  const from = start + startHeading.length;
  const end = endHeading ? body.indexOf(endHeading, from) : -1;
  return body.slice(from, end >= 0 ? end : body.length).trim();
}

/** Code Spec / Include Mapping Spec 상단의 목적·운영 원칙·생성 순서·조건 */
export function buildCodegenGovernancePrompt(
  codeSpecMarkdown: string,
  includeMappingSpecMarkdown: string,
): string {
  const templatePrinciples = extractMarkdownSection(
    codeSpecMarkdown,
    "## 템플릿 운영 원칙",
    "\n---\n\n## TOP",
  );
  const includeOverview = extractMarkdownSection(
    includeMappingSpecMarkdown,
    "## 1. 문서 개요",
    "\n\n## 2. 프로그램",
  );
  const generationOrder = extractMarkdownSection(
    includeMappingSpecMarkdown,
    "## 11. 코드 생성 순서",
    "\n---\n\n## 12.",
  );
  const generationConditions = extractMarkdownSection(
    includeMappingSpecMarkdown,
    "## 12. 생성 조건 / 비고",
  );

  return `## Code Template Specification — 템플릿 운영 원칙
${templatePrinciples || "(템플릿 운영 원칙 없음)"}

## Include Mapping Specification — 문서 개요
${includeOverview || "(문서 개요 없음)"}

## Include Mapping Specification — 코드 생성 순서
${generationOrder || "(코드 생성 순서 없음)"}

## Include Mapping Specification — 생성 조건 / 비고
${generationConditions || "(생성 조건 없음)"}`;
}

export type CodegenTemplateBundle = {
  codeSpecMarkdown: string;
  includeMappingSpecMarkdown: string;
};

export async function loadCodegenTemplates(): Promise<CodegenTemplateBundle> {
  const base = path.join(process.cwd(), "public", "templates");
  let codeSpecMarkdown = CODE_SPEC_TEMPLATE_MD;
  let includeMappingSpecMarkdown = INCLUDE_MAPPING_SPEC_MD;

  try {
    const txt = (await readFile(path.join(base, "Code_Spec.md"), "utf8")).trim();
    if (txt) codeSpecMarkdown = txt;
  } catch {
    // fallback
  }

  try {
    const txt = (
      await readFile(path.join(base, "Include_Mapping_Spec.md"), "utf8")
    ).trim();
    if (txt) includeMappingSpecMarkdown = txt;
  } catch {
    // fallback
  }

  return { codeSpecMarkdown, includeMappingSpecMarkdown };
}

