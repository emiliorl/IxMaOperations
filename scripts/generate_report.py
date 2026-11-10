import json
import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)

def set_cell_border(cell, **kwargs):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = f'w:{edge}'
            element = OxmlElement(tag)
            element.set(qn('w:val'), edge_data.get('val', 'single'))
            element.set(qn('w:sz'), str(edge_data.get('sz', 4)))
            element.set(qn('w:space'), '0')
            element.set(qn('w:color'), edge_data.get('color', 'E2E8F0'))
            tcBorders.append(element)
        else:
            tag = f'w:{edge}'
            element = OxmlElement(tag)
            element.set(qn('w:val'), 'none')
            tcBorders.append(element)
    tcPr.append(tcBorders)

def add_heading_1(doc, text, space_before=14, space_after=6):
    h = doc.add_paragraph()
    h.paragraph_format.space_before = Pt(space_before)
    h.paragraph_format.space_after = Pt(space_after)
    h.paragraph_format.keep_with_next = True
    r = h.add_run(text)
    r.font.name = "Arial"
    r.font.size = Pt(13)
    r.font.bold = True
    r.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
    return h

def add_heading_2(doc, text, space_before=10, space_after=4):
    h = doc.add_paragraph()
    h.paragraph_format.space_before = Pt(space_before)
    h.paragraph_format.space_after = Pt(space_after)
    h.paragraph_format.keep_with_next = True
    r = h.add_run(text)
    r.font.name = "Arial"
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = RGBColor(30, 41, 59) # Slate 800
    return h

def add_body_p(doc, text="", space_before=0, space_after=4, bold_prefix="", italic_prefix=""):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_b = p.add_run(bold_prefix)
        r_b.font.name = "Arial"
        r_b.font.size = Pt(9.5)
        r_b.font.bold = True
        r_b.font.color.rgb = RGBColor(15, 23, 42)
    if italic_prefix:
        r_i = p.add_run(italic_prefix)
        r_i.font.name = "Arial"
        r_i.font.size = Pt(9.5)
        r_i.font.italic = True
        r_i.font.color.rgb = RGBColor(71, 85, 105)
    if text:
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(51, 65, 85) # Slate 700
    return p

def add_callout(doc, text, title="NOTA IMPORTANTE", bg="F8FAFC", border_color="0284C7", title_color="0369A1"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    cell = tbl.rows[0].cells[0]
    cell.width = Inches(6.5)
    set_cell_shading(cell, bg)
    set_cell_margins(cell, top=100, bottom=100, left=160, right=140)
    set_cell_border(cell, left={'val': 'single', 'sz': 24, 'color': border_color},
                          top={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                          bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                          right={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
    cp = cell.paragraphs[0]
    cp.paragraph_format.space_before = Pt(0)
    cp.paragraph_format.space_after = Pt(2)
    r_t = cp.add_run(f"■ {title}\n")
    r_t.font.name = "Arial"
    r_t.font.size = Pt(9.5)
    r_t.font.bold = True
    # parse title_color hex
    tc_r, tc_g, tc_b = int(title_color[0:2], 16), int(title_color[2:4], 16), int(title_color[4:6], 16)
    r_t.font.color.rgb = RGBColor(tc_r, tc_g, tc_b)

    r_c = cp.add_run(text)
    r_c.font.name = "Arial"
    r_c.font.size = Pt(9)
    r_c.font.color.rgb = RGBColor(51, 65, 85)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def build_report():
    with open('scripts/extracted_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    doc = Document()
    
    # Page setup: Standard Letter, 0.75 in margins for maximum elegance and compact layout
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.65)
        section.bottom_margin = Inches(0.65)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # -------------------------------------------------------------
    # PAGE 1: EXECUTIVE SUMMARY (STRICTLY 1 PAGE, STRAIGHT TO THE POINT)
    # -------------------------------------------------------------
    
    # Header Branding
    p_meta = doc.add_paragraph()
    p_meta.paragraph_format.space_before = Pt(0)
    p_meta.paragraph_format.space_after = Pt(2)
    r_meta = p_meta.add_run("IXMA OPERATIONS  |  PLAN DE IA Y AUTOMATIZACIÓN OPERATIVA")
    r_meta.font.name = "Arial"
    r_meta.font.size = Pt(8.5)
    r_meta.font.bold = True
    r_meta.font.color.rgb = RGBColor(100, 116, 139)

    # Document Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(2)
    p_title.paragraph_format.space_after = Pt(2)
    r_title = p_title.add_run("Reporte Ejecutivo — Primera Semana de Operaciones")
    r_title.font.name = "Arial"
    r_title.font.size = Pt(17)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(15, 23, 42)

    # Subtitle
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(6)
    r_sub = p_sub.add_run("Seguimiento y avances de implantación técnica en Studio Domus y Domus Works")
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(10.5)
    r_sub.font.color.rgb = RGBColor(71, 85, 105)

    # Metadata Grid (4 cells)
    meta_items = [
        ("CLIENTE", "Studio Domus / Domus Works"),
        ("PERÍODO EVALUADO", "Semana 1: 02 al 06 Nov 2026"),
        ("CONSULTOR RESPONSABLE", "Emilio Ramírez (IxMa)"),
        ("ESTADO GENERAL", "En Marcha / Configuración")
    ]
    meta_tbl = doc.add_table(rows=1, cols=4)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_tbl.autofit = False
    col_w = Inches(7.0 / 4.0)
    for i, (k, v) in enumerate(meta_items):
        cell = meta_tbl.rows[0].cells[i]
        cell.width = col_w
        set_cell_shading(cell, "F8FAFC")
        set_cell_margins(cell, top=70, bottom=70, left=90, right=90)
        set_cell_border(cell, top={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                              bottom={'val': 'single', 'sz': 12, 'color': '0284C7'},
                              left={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                              right={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
        cp = cell.paragraphs[0]
        cp.paragraph_format.space_before = Pt(0)
        cp.paragraph_format.space_after = Pt(0)
        rk = cp.add_run(f"{k}\n")
        rk.font.name = "Arial"
        rk.font.size = Pt(7)
        rk.font.bold = True
        rk.font.color.rgb = RGBColor(100, 116, 139)
        rv = cp.add_run(v)
        rv.font.name = "Arial"
        rv.font.size = Pt(8.5)
        rv.font.bold = True
        rv.font.color.rgb = RGBColor(30, 41, 59)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # Summary KPI row (Numbers)
    kpis = [
        ("47", "Problemas Mapeados\n(11 Departamentos)"),
        ("21", "Iniciativas en\nProgreso Activo"),
        ("6", "Tareas en Espera\n(Accesos / Machotes)"),
        ("18", "Líderes y Usuarios\nen el Portal Activo")
    ]
    kpi_tbl = doc.add_table(rows=1, cols=4)
    kpi_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    kpi_tbl.autofit = False
    for i, (num, lbl) in enumerate(kpis):
        cell = kpi_tbl.rows[0].cells[i]
        cell.width = col_w
        set_cell_shading(cell, "F1F5F9")
        set_cell_margins(cell, top=70, bottom=70, left=80, right=80)
        set_cell_border(cell, top={'val': 'single', 'sz': 4, 'color': 'CBD5E1'},
                              bottom={'val': 'single', 'sz': 6, 'color': 'CBD5E1'},
                              left={'val': 'single', 'sz': 4, 'color': 'CBD5E1'},
                              right={'val': 'single', 'sz': 4, 'color': 'CBD5E1'})
        cp = cell.paragraphs[0]
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.space_before = Pt(0)
        cp.paragraph_format.space_after = Pt(0)
        r_num = cp.add_run(f"{num}\n")
        r_num.font.name = "Arial"
        r_num.font.size = Pt(15)
        r_num.font.bold = True
        r_num.font.color.rgb = RGBColor(2, 132, 199) if i != 2 else RGBColor(217, 119, 6) # amber for waiting
        r_lbl = cp.add_run(lbl)
        r_lbl.font.name = "Arial"
        r_lbl.font.size = Pt(7.5)
        r_lbl.font.color.rgb = RGBColor(71, 85, 105)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # 1. Resumen Ejecutivo de la Semana
    add_heading_2(doc, "1. Resumen Ejecutivo y Logros Principales", space_before=6, space_after=2)
    add_body_p(doc, "Durante la primera semana de intervención se completó el despliegue de la infraestructura operativa y el portal de operaciones de IxMa para Domus, configurando las 11 carpetas departamentales con cifrado de alta seguridad y habilitando el acceso a 18 miembros de los equipos de Studio Domus y Domus Works. Se iniciaron activamente 21 líneas de trabajo técnico enfocadas en las áreas de mayor impacto inmediato (BIM, Domus Works / Marketing, Contabilidad, Interiores y PM).", space_before=0, space_after=3)

    bullet_p1 = add_body_p(doc, " Publicación de la suite de software BlueprintQA (instaladores Windows y macOS) y prompt de auditoría de planos ejecutivos para el equipo BIM (Carlos Flores).", space_after=2, bold_prefix="• BIM / VDC:")
    bullet_p2 = add_body_p(doc, " Resolución técnica del Ticket #1 levantado por Alejandra Chapas (DW-4), entregando parámetros de control estricto en Midjourney (--style raw, --s 100, --iw 2.0) para frenar deformaciones geométricas y alucinaciones en renders comerciales.", space_after=2, bold_prefix="• Marketing / Domus Works:")
    bullet_p3 = add_body_p(doc, " Formulación de las hojas de conversión de facturas FEL hacia Aspel y conciliación automática del tipo de cambio SAT.", space_after=3, bold_prefix="• Contabilidad y Administración:")

    # 2. Situación de Coordinación y Reuniones con Líderes
    add_heading_2(doc, "2. Estado de Sesiones con Líderes de Área", space_before=6, space_after=2)
    add_body_p(doc, "Con el objetivo de mantener total transparencia en la coordinación del proyecto, se detallan los puntos pendientes de interacción presencial/virtual durante esta primera etapa:", space_before=0, space_after=2)

    add_body_p(doc, " Durante la primera semana no se tuvo la oportunidad de concretar la sesión de trabajo con Valeria (Líder de Recursos Humanos) ni con Hans (Líder de Arquitectura). Ambas sesiones quedan programadas como máxima prioridad de inicio para la Semana 2.", space_after=2, bold_prefix="• Valeria (RR.HH.) y Hans (Arquitectura):")
    add_body_p(doc, " No se coordinó reunión durante estos días debido a que el consultor se encuentra desarrollando y afinando las configuraciones técnicas previas requeridas para sus flujos de trabajo (asistentes de minutas, tableros de Monday.com y prefactibilidad). Una vez concluidas estas plantillas base, se convocará a la sesión de validación directa.", space_after=3, bold_prefix="• José Pablo (Gerencia de Proyectos) y Keegan:")

    # 3. Bloqueos y Tareas en Espera de Insumos (Templates / Machotes y Accesos)
    add_heading_2(doc, "3. Tareas en Estado de Espera (Requerimientos de Insumos)", space_before=6, space_after=2)
    add_body_p(doc, "Se identificaron 6 tareas que han quedado en estado de espera ('waiting') debido exclusivamente a la falta de accesos a sistemas internos o a la carencia de plantillas/machotes base para estructurar la información:", space_before=0, space_after=2)

    add_body_p(doc, " En Construcción (CON-2) y Contabilidad (CT-1) se requiere asignación de permisos a carpetas compartidas y sistemas de compras/ERP para procesar órdenes y comprobantes reales.", space_after=2, bold_prefix="• Gestión de Accesos:")
    add_body_p(doc, " En Construcción (CON-1) se requiere el machote base del Manual de Calidad y Garantías (~100 págs.). En PM (GP-4) y Construcción (CON-4) se requiere la estructura/formato acordado de Monday.com y la tabla de dedicación de tiempos para programar las automatizaciones sin duplicidad manual.", space_after=4, bold_prefix="• Machotes y Plantillas:")

    # Callout / Box at bottom of Page 1
    add_callout(doc, 
                "Plan de Acción Inmediato (Semana 2): 1) Celebrar reuniones presenciales con Valeria y Hans; 2) Presentar configuraciones a José Pablo y Keegan; 3) Recibir machotes de manuales y accesos para desbloquear las tareas en espera; 4) Iniciar piloto de auditoría de planos en BIM.", 
                title="PRIORIDAD OPERATIVA INMEDIATA",
                bg="EFF6FF", border_color="2563EB", title_color="1E40AF")

    # END OF PAGE 1: Hard page break
    doc.add_page_break()

    # -------------------------------------------------------------
    # PAGE 2+: BITÁCORA DETALLADA Y ELABORACIÓN POR ÁREA
    # -------------------------------------------------------------
    
    add_heading_1(doc, "Bitácora Cronológica de Actividades (Semana 1)", space_before=0, space_after=6)
    add_body_p(doc, "A continuación se presenta el registro detallado de eventos, cambios de estado y entregas técnicas registradas en el sistema central de IxMa Operations, comprendidas entre el 02 y el 09 de Noviembre de 2026.", space_before=0, space_after=8)

    # Event Table
    event_tbl = doc.add_table(rows=1, cols=5)
    event_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    event_tbl.autofit = False

    headers = [("FECHA / HORA", Inches(1.2)), 
               ("ÁREA", Inches(1.1)), 
               ("CÓDIGO", Inches(0.8)), 
               ("ACTIVIDAD / EVENTO REGISTRADO", Inches(2.7)), 
               ("ESTADO", Inches(1.2))]
    
    for idx, (h_text, w) in enumerate(headers):
        cell = event_tbl.rows[0].cells[idx]
        cell.width = w
        set_cell_shading(cell, "1E293B") # slate 800
        set_cell_margins(cell, top=80, bottom=80, left=90, right=90)
        set_cell_border(cell, top={'val': 'single', 'sz': 4, 'color': '0F172A'},
                              bottom={'val': 'single', 'sz': 12, 'color': '0F172A'},
                              left={'val': 'none'}, right={'val': 'none'})
        cp = cell.paragraphs[0]
        cp.paragraph_format.space_before = Pt(0)
        cp.paragraph_format.space_after = Pt(0)
        r = cp.add_run(h_text)
        r.font.name = "Arial"
        r.font.size = Pt(8)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    # Events from data
    # Format and group events cleanly
    sorted_events = sorted(data['events'], key=lambda x: x['created_at'])
    for i, ev in enumerate(sorted_events):
        row = event_tbl.add_row()
        dt_parts = ev['created_at'].split('T')
        date_str = dt_parts[0]
        time_str = dt_parts[1][:5]
        
        dept = ev['milestone']['dept'] if ev['milestone'] else "General / Portal"
        code = ev['milestone']['code'] if ev['milestone'] else ("Ticket" if ev['ticket_id'] else "—")
        title = ev['milestone']['title'] if ev['milestone'] else ""
        
        kind_desc = ""
        status_label = ""
        status_bg = "F8FAFC"
        status_color = RGBColor(71, 85, 105)

        if ev['kind'] == 'plan_status':
            kind_desc = f"Cambio de estado: {title}"
            status_label = f"{ev['from_status']} → {ev['to_status']}"
            if ev['to_status'] == 'in_progress':
                status_bg = "F0FDF4"
                status_color = RGBColor(22, 101, 52)
            elif ev['to_status'] == 'waiting':
                status_bg = "FFFBEB"
                status_color = RGBColor(180, 83, 9)
        elif ev['kind'] == 'ticket_opened':
            kind_desc = f"Apertura de Ticket #{data['tickets'][0]['ticket_number'] if data['tickets'] else '1'} por {ev['actor']}: {title}"
            status_label = "Abierto (Open)"
            status_bg = "FEF2F2"
            status_color = RGBColor(153, 27, 27)
        elif ev['kind'] == 'comment_added':
            kind_desc = f"Respuesta técnica del consultor (Emilio Ramírez) con directrices de Midjourney"
            status_label = "Comentario técnico"
            status_bg = "EFF6FF"
            status_color = RGBColor(30, 64, 175)
        elif ev['kind'] == 'ticket_status':
            kind_desc = f"Actualización de Ticket #{data['tickets'][0]['ticket_number'] if data['tickets'] else '1'} tras entrega de guía"
            status_label = "needs_review"
            status_bg = "F0FDF4"
            status_color = RGBColor(22, 101, 52)

        row_bg = "FFFFFF" if i % 2 == 0 else "F8FAFC"

        # Col 0: Fecha / Hora
        c0 = row.cells[0]
        c0.width = Inches(1.2)
        set_cell_shading(c0, row_bg)
        set_cell_margins(c0, top=60, bottom=60, left=80, right=80)
        set_cell_border(c0, bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
        cp0 = c0.paragraphs[0]
        cp0.paragraph_format.space_after = Pt(0)
        r0 = cp0.add_run(f"{date_str}\n{time_str} hrs")
        r0.font.name = "Arial"
        r0.font.size = Pt(8)
        r0.font.color.rgb = RGBColor(100, 116, 139)

        # Col 1: Área
        c1 = row.cells[1]
        c1.width = Inches(1.1)
        set_cell_shading(c1, row_bg)
        set_cell_margins(c1, top=60, bottom=60, left=80, right=80)
        set_cell_border(c1, bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
        cp1 = c1.paragraphs[0]
        cp1.paragraph_format.space_after = Pt(0)
        r1 = cp1.add_run(dept)
        r1.font.name = "Arial"
        r1.font.size = Pt(8)
        r1.font.bold = True
        r1.font.color.rgb = RGBColor(30, 41, 59)

        # Col 2: Código
        c2 = row.cells[2]
        c2.width = Inches(0.8)
        set_cell_shading(c2, row_bg)
        set_cell_margins(c2, top=60, bottom=60, left=80, right=80)
        set_cell_border(c2, bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
        cp2 = c2.paragraphs[0]
        cp2.paragraph_format.space_after = Pt(0)
        r2 = cp2.add_run(code)
        r2.font.name = "Arial"
        r2.font.size = Pt(8)
        r2.font.bold = True
        r2.font.color.rgb = RGBColor(2, 132, 199)

        # Col 3: Detalle
        c3 = row.cells[3]
        c3.width = Inches(2.7)
        set_cell_shading(c3, row_bg)
        set_cell_margins(c3, top=60, bottom=60, left=80, right=80)
        set_cell_border(c3, bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
        cp3 = c3.paragraphs[0]
        cp3.paragraph_format.space_after = Pt(0)
        r3 = cp3.add_run(kind_desc)
        r3.font.name = "Arial"
        r3.font.size = Pt(8)
        r3.font.color.rgb = RGBColor(51, 65, 85)

        # Col 4: Estado
        c4 = row.cells[4]
        c4.width = Inches(1.2)
        set_cell_shading(c4, status_bg)
        set_cell_margins(c4, top=60, bottom=60, left=80, right=80)
        set_cell_border(c4, bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
        cp4 = c4.paragraphs[0]
        cp4.paragraph_format.space_after = Pt(0)
        r4 = cp4.add_run(status_label)
        r4.font.name = "Arial"
        r4.font.size = Pt(7.5)
        r4.font.bold = True
        r4.font.color.rgb = status_color

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # -------------------------------------------------------------
    # SECTION 2: DETAILED ANALYSIS BY DEPARTMENT
    # -------------------------------------------------------------
    add_heading_1(doc, "Detalle de Avances y Estado por Área", space_before=14, space_after=6)

    # 1. BIM / VDC
    add_heading_2(doc, "BIM / VDC (Modelado de Información y VDC) — Líder: Carlos Flores", space_before=6, space_after=2)
    add_body_p(doc, "El departamento BIM cuenta con 6 casos de uso estructurados. Durante la primera semana se pusieron en marcha las iniciativas críticas de interoperabilidad entre Revit y la hoja maestra MET, y se abordó el reto de auditoría y control de calidad de planos ejecutivos.", space_after=3)
    add_body_p(doc, " Se generaron y pusieron a disposición del equipo los paquetes ejecutables para Windows (BlueprintQA-ProductionV1-windows.zip, 69.5 KB) y macOS (BlueprintQA-ProductionV1-macos.tar.gz, 64.7 KB), así como el script de auditoría en texto plano (Prompt_Auditoria_Planos_BIM.txt).", space_after=2, bold_prefix="• Software y Herramientas:")
    add_body_p(doc, " La iniciativa BIM-3 (Auditoría de planos ejecutivos asistida por IA) quedó en estado 'waiting' a la espera de la selección final del motor de IA que validará los hatches, cotas y rotulación sin requerir infraestructura pesada local.", space_after=4, bold_prefix="• Estado de Espera:")

    # 2. Domus Works / Marketing
    add_heading_2(doc, "Domus Works: Célula Digital y de Diseño — Líderes: Alejandra Chapas / Mercedes Schönfeld", space_before=6, space_after=2)
    add_body_p(doc, "Área enfocada en resolver el problema del aspecto genérico y deformaciones geométricas generadas por IA en renders comerciales y pauta publicitaria (DW-4).", space_after=3)
    add_body_p(doc, " La diseñadora Alejandra Chapas levantó el Ticket #1 consultando parámetros para evitar estética genérica. El consultor documentó y entregó la formulación técnica estándar:", space_after=2, bold_prefix="• Resolución de Incidencia (Ticket #1):")
    add_body_p(doc, "1) Parámetros obligatorios: '--style raw' (desactiva sobresaturación artificial), '--s 100' (estilización baja para mantener vanos rectos), '--iw 2.0' (peso máximo al render base CAD del cliente); 2) Sustitución de términos cliché ('photorealistic, 8k') por metadatos fotográficos reales ('shot on Hasselblad H6D-100c, tilt-shift lens 24mm, architectural editorial photograph').", space_after=2, italic_prefix="    ")
    add_body_p(doc, " Activación de prompts para generación de copy mensual (DW-2) con diccionarios negativos y parámetros para consistencia de personajes en clips de video (DW-5).", space_after=4, bold_prefix="• Copy y Video:")

    # 3. Contabilidad y Administración
    add_heading_2(doc, "Contabilidad y Administración — Líder: Jennifer de León", space_before=6, space_after=2)
    add_body_p(doc, "Se busca eliminar la doble digitación manual de facturas FEL y recibos en Excel y el ERP Aspel. Se activaron 5 iniciativas (CT-1 a CT-5).", space_after=3)
    add_body_p(doc, " Se programó la validación entre las 3-4 entidades legales de Domus (CT-3) para evitar confusiones de NIT, y la fórmula para capturar el tipo de cambio oficial del Banco de Guatemala (CT-2).", space_after=2, bold_prefix="• Avances:")
    add_body_p(doc, " El caso CT-1 (conversión masiva de facturas FEL) quedó en 'waiting' requiriendo la plantilla/formato exacto de importación de Aspel y acceso a un lote de comprobantes de muestra.", space_after=4, bold_prefix="• Espera:")

    # 4. Construcción y Operaciones de Obra
    add_heading_2(doc, "Construcción y Operaciones de Obra", space_before=6, space_after=2)
    add_body_p(doc, "Equipo de campo orientado a la entrega de proyectos y control presupuestario.", space_after=3)
    add_body_p(doc, "1) CON-1 (Manual de Calidad y Garantías de ~100 págs.) se encuentra en espera del machote/documento base para configurar el asistente de compilación automática; 2) CON-2 (Detección de sobrecostos) está a la espera de accesos al sistema de control de compras; 3) CON-4 (Métricas de tiempos de tareas) requiere la estructura acordada en Monday.com.", space_after=4, bold_prefix="• Tareas en Espera Crítica:")

    # 5. Gerencia de Proyectos (PM Studio Domus y PM Domus Works)
    add_heading_2(doc, "Gerencia de Proyectos (PM) — José Pablo Cuellar / Stephanie Silva", space_before=6, space_after=2)
    add_body_p(doc, "Enfocado en sistematizar minutas de reuniones, agendas con clientes y seguimiento en Monday.com sin generar carga manual.", space_after=3)
    add_body_p(doc, " Se avanzó en la configuración del asistente de minutas con glosario guatemalteco de construcción (GP-1), captura de reuniones presenciales con dispositivo móvil (GP-2) y enlaces de citas directos en Google Calendar (GP-3).", space_after=2, bold_prefix="• Avances en Configuración:")
    add_body_p(doc, " GP-4 (acuerdos digitados a mano en Monday.com) está en espera de la definición final del tablero de Monday.com para integrar las automatizaciones nativas. Por esta razón, la sesión presencial con José Pablo se agendó para la Semana 2 para presentar el paquete completo listo.", space_after=4, bold_prefix="• Situación:")

    # 6. Diseño de Interiores
    add_heading_2(doc, "Diseño de Interiores — Líderes: Alejandra Mejía / Ana Morales", space_before=6, space_after=2)
    add_body_p(doc, "Se activaron las iniciativas INT-1 (control de deformaciones espaciales en renders interiores), INT-2 (higiene de sesiones en chats de IA sin perder contexto) e INT-3 (aceleración de naming, storytelling y moodboards conceptuales).", space_after=4)

    # 7. Arquitectura y Factibilidad
    add_heading_2(doc, "Arquitectura y Factibilidad — Líder: Hans", space_before=6, space_after=2)
    add_body_p(doc, "Se mantiene el mapeo de 5 casos clave (ARQ-1 a ARQ-5), destacando el pre-dimensionamiento de mezcla de apartamentos en Excel. No se sostuvo reunión con Hans en la Semana 1, quedando convocada como prioridad inmediata para la Semana 2.", space_after=4)

    # 8. Recursos Humanos y Operaciones
    add_heading_2(doc, "Recursos Humanos y Operaciones de Personal — Líder: Valeria", space_before=6, space_after=2)
    add_body_p(doc, "Prioridad centrada en RH-1 (marcajes biométricos incompletos y extensión a monitoreo de laptops). No se concretó reunión con Valeria en la primera semana; se presentará la propuesta integral de Insightful en la Semana 2.", space_after=4)

    # -------------------------------------------------------------
    # SECTION 3: MATRIX OF WAITING TASKS (INPUTS REQUIRED)
    # -------------------------------------------------------------
    add_heading_1(doc, "Matriz de Tareas en Espera de Insumos y Accesos", space_before=14, space_after=6)
    add_body_p(doc, "Para asegurar la continuidad del cronograma y reactivar las tareas detenidas, se solicita la gestión de los siguientes insumos prioritarios:", space_before=0, space_after=6)

    waiting_tbl = doc.add_table(rows=1, cols=5)
    waiting_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    waiting_tbl.autofit = False

    w_headers = [("CÓDIGO", Inches(0.8)), 
                 ("ÁREA", Inches(1.2)), 
                 ("INICIATIVA / CASO", Inches(2.2)), 
                 ("INSUMO / ACCESO REQUERIDO", Inches(1.8)), 
                 ("RESPONSABLE", Inches(1.0))]
    
    for idx, (h_text, w) in enumerate(w_headers):
        cell = waiting_tbl.rows[0].cells[idx]
        cell.width = w
        set_cell_shading(cell, "0F172A")
        set_cell_margins(cell, top=70, bottom=70, left=80, right=80)
        set_cell_border(cell, top={'val': 'single', 'sz': 4, 'color': '0F172A'},
                              bottom={'val': 'single', 'sz': 8, 'color': '0F172A'},
                              left={'val': 'none'}, right={'val': 'none'})
        cp = cell.paragraphs[0]
        cp.paragraph_format.space_after = Pt(0)
        r = cp.add_run(h_text)
        r.font.name = "Arial"
        r.font.size = Pt(8)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    waiting_rows = [
        ("CON-1", "Construcción", "Manual de calidad y garantías (~100 págs.)", "Machote / documento base de manual anterior", "Construcción / PM"),
        ("CON-2", "Construcción", "Detección de sobrecostos de presupuesto", "Gestión de accesos a sistema de compras / ERP", "Admin / Compras"),
        ("CON-4", "Construcción", "Medición de tiempos en tareas de obra", "Tabla de dedicación y estructura de tiempos", "Gerencia Obra"),
        ("CT-1", "Contabilidad", "Facturas FEL y recibos a Excel/Aspel", "Plantilla de importación Aspel + muestra FEL", "Jennifer de León"),
        ("GP-4", "Gerencia Proy.", "Acuerdos de minutas en Monday.com", "Formato estándar y tablero en Monday.com", "José Pablo / PM"),
        ("BIM-3", "BIM / VDC", "Auditoría de planos asistida por IA", "Aprobación de motor de IA para BlueprintQA", "Carlos Flores / TI")
    ]

    for i, (cd, area, caso, insumo, resp) in enumerate(waiting_rows):
        row = waiting_tbl.add_row()
        row_bg = "FFFFFF" if i % 2 == 0 else "F8FAFC"
        data_cells = [(cd, Inches(0.8), True, RGBColor(217, 119, 6)),
                      (area, Inches(1.2), True, RGBColor(30, 41, 59)),
                      (caso, Inches(2.2), False, RGBColor(51, 65, 85)),
                      (insumo, Inches(1.8), True, RGBColor(180, 83, 9)),
                      (resp, Inches(1.0), False, RGBColor(71, 85, 105))]
        for c_idx, (val, w, is_bold, color) in enumerate(data_cells):
            c = row.cells[c_idx]
            c.width = w
            set_cell_shading(c, row_bg)
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            set_cell_border(c, bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})
            cp = c.paragraphs[0]
            cp.paragraph_format.space_after = Pt(0)
            r = cp.add_run(val)
            r.font.name = "Arial"
            r.font.size = Pt(8)
            r.font.bold = is_bold
            r.font.color.rgb = color

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # -------------------------------------------------------------
    # SECTION 4: PLAN FOR WEEK 2
    # -------------------------------------------------------------
    add_heading_1(doc, "Plan de Trabajo y Próximos Pasos (Semana 2)", space_before=14, space_after=6)
    
    plan_steps = [
        ("Sesiones con Líderes Pendientes:", " Agendar y llevar a cabo las reuniones presenciales con Valeria (RR.HH.) para revisar la propuesta de biométricos y monitoreo de laptops, y con Hans (Arquitectura) para definir el flujo de pre-dimensionamiento de mezcla en ARQ-1."),
        ("Presentación a José Pablo y Keegan:", " Presentar las configuraciones listas de minutas y plantillas operativas a José Pablo Cuellar y a Keegan para su validación en campo y conexión con Monday.com."),
        ("Desbloqueo de Tareas en Espera:", " Recibir el machote del Manual de Calidad (CON-1) y la plantilla de importación a Aspel (CT-1) para iniciar las pruebas con datos reales."),
        ("Prueba Piloto de BlueprintQA:", " Ejecutar una corrida de prueba de auditoría de planos en un archivo real de Revit/CAD con el equipo de Carlos Flores en BIM."),
        ("Evaluación de Herramientas de Imagen en Domus Works:", " Dar seguimiento al Ticket #1 con Alejandra Chapas y Mercedes Schönfeld para confirmar la calidad visual obtenida con los nuevos parámetros.")
    ]

    for title, desc in plan_steps:
        add_body_p(doc, desc, space_after=3, bold_prefix=f"1. {title}" if "Sesiones" in title else (f"2. {title}" if "Presentación" in title else (f"3. {title}" if "Desbloqueo" in title else (f"4. {title}" if "Prueba" in title else f"5. {title}"))))

    # Final signature line
    p_sign = doc.add_paragraph()
    p_sign.paragraph_format.space_before = Pt(16)
    p_sign.paragraph_format.space_after = Pt(0)
    p_sign.paragraph_format.keep_with_next = True
    r_sign1 = p_sign.add_run("Atentamente,\n")
    r_sign1.font.name = "Arial"
    r_sign1.font.size = Pt(9)
    r_sign1.font.color.rgb = RGBColor(100, 116, 139)
    
    r_sign2 = p_sign.add_run("Emilio Ramírez\n")
    r_sign2.font.name = "Arial"
    r_sign2.font.size = Pt(10)
    r_sign2.font.bold = True
    r_sign2.font.color.rgb = RGBColor(15, 23, 42)

    r_sign3 = p_sign.add_run("Consultor Principal — IxMa Operations\neramirez@ixmaoperations.com")
    r_sign3.font.name = "Arial"
    r_sign3.font.size = Pt(8.5)
    r_sign3.font.color.rgb = RGBColor(71, 85, 105)

    output_filename = "Reporte_Semana_1_Domus_IxMaOperations.docx"
    doc.save(output_filename)
    print(f"Document saved successfully as '{output_filename}'")

if __name__ == '__main__':
    build_report()

