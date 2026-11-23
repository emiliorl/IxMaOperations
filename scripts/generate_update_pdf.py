import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


def register_fonts():
    font_dir = r"C:\Windows\Fonts"
    georgia = os.path.join(font_dir, "georgia.ttf")
    georgia_b = os.path.join(font_dir, "georgiab.ttf")
    calibri = os.path.join(font_dir, "calibri.ttf")
    calibri_b = os.path.join(font_dir, "calibrib.ttf")
    calibri_i = os.path.join(font_dir, "calibrii.ttf")
    calibri_bi = os.path.join(font_dir, "calibriz.ttf")

    serif = "Times-Roman"
    serif_b = "Times-Bold"
    if os.path.exists(georgia) and os.path.exists(georgia_b):
        pdfmetrics.registerFont(TTFont("Georgia", georgia))
        pdfmetrics.registerFont(TTFont("Georgia-Bold", georgia_b))
        serif = "Georgia"
        serif_b = "Georgia-Bold"

    sans = "Helvetica"
    sans_b = "Helvetica-Bold"
    sans_i = "Helvetica-Oblique"
    if os.path.exists(calibri) and os.path.exists(calibri_b):
        pdfmetrics.registerFont(TTFont("Calibri", calibri))
        pdfmetrics.registerFont(TTFont("Calibri-Bold", calibri_b))
        if os.path.exists(calibri_i):
            pdfmetrics.registerFont(TTFont("Calibri-Italic", calibri_i))
        if os.path.exists(calibri_bi):
            pdfmetrics.registerFont(TTFont("Calibri-BoldItalic", calibri_bi))
        pdfmetrics.registerFontFamily(
            "Calibri",
            normal="Calibri",
            bold="Calibri-Bold",
            italic="Calibri-Italic" if os.path.exists(calibri_i) else "Calibri",
            boldItalic="Calibri-BoldItalic" if os.path.exists(calibri_bi) else "Calibri-Bold",
        )
        sans = "Calibri"
        sans_b = "Calibri-Bold"
        sans_i = "Calibri-Italic" if os.path.exists(calibri_i) else "Calibri"

    return serif, serif_b, sans, sans_b, sans_i


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Calibri" if "Calibri" in pdfmetrics.getRegisteredFontNames() else "Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#737974"))
    canvas.drawRightString(letter[0] - 0.65 * inch, 0.35 * inch, f"IxMa Operations  ·  Página {doc.page}")
    canvas.restoreState()


def build_pdf(output_path="Actualizacion_Avances_Domus_IxMaOperations.pdf"):
    serif, serif_b, sans, sans_b, sans_i = register_fonts()

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        title="Documentación de Avances y Entregas — Studio Domus y Domus Works",
        author="Emilio Ramírez — IxMa Operations",
    )

    # Warm Editorial Consulting Palette
    ink = colors.HexColor("#1C1F1D")
    ink_soft = colors.HexColor("#3F4540")
    ink_muted = colors.HexColor("#737974")
    forest = colors.HexColor("#1B4332")
    forest_soft = colors.HexColor("#EEF4F0")
    terracotta = colors.HexColor("#9A5B32")
    sand_bg = colors.HexColor("#F7F5F0")
    amber_bg = colors.HexColor("#FDF8F3")
    hairline = colors.HexColor("#DDD9D0")

    styles = getSampleStyleSheet()

    s_brand = ParagraphStyle(
        "Brand", parent=styles["Normal"], fontName=sans_b, fontSize=8, leading=10,
        textColor=forest, spaceAfter=3
    )
    s_title = ParagraphStyle(
        "Title", parent=styles["Normal"], fontName=serif_b, fontSize=16, leading=20,
        textColor=ink, spaceAfter=3
    )
    s_meta = ParagraphStyle(
        "Meta", parent=styles["Normal"], fontName=sans, fontSize=9, leading=12,
        textColor=ink_muted, spaceAfter=8
    )
    s_h1 = ParagraphStyle(
        "H1", parent=styles["Normal"], fontName=serif_b, fontSize=12, leading=15,
        textColor=forest, spaceBefore=10, spaceAfter=5
    )
    s_h1_pending = ParagraphStyle(
        "H1Pending", parent=styles["Normal"], fontName=serif_b, fontSize=12, leading=15,
        textColor=terracotta, spaceBefore=12, spaceAfter=5
    )
    s_body = ParagraphStyle(
        "Body", parent=styles["Normal"], fontName=sans, fontSize=9.3, leading=13.2,
        textColor=ink_soft, spaceAfter=6
    )
    s_team_title = ParagraphStyle(
        "TeamTitle", parent=styles["Normal"], fontName=sans_b, fontSize=10, leading=13,
        textColor=ink, spaceAfter=2
    )
    s_team_tag = ParagraphStyle(
        "TeamTag", parent=styles["Normal"], fontName=sans_b, fontSize=8, leading=10,
        textColor=forest, alignment=2
    )
    s_team_tag_dev = ParagraphStyle(
        "TeamTagDev", parent=styles["Normal"], fontName=sans_b, fontSize=8, leading=10,
        textColor=terracotta, alignment=2
    )
    s_bullet = ParagraphStyle(
        "Bullet", parent=styles["Normal"], fontName=sans, fontSize=9, leading=12.6,
        textColor=ink_soft, leftIndent=10, spaceAfter=2.5
    )
    s_pending_title = ParagraphStyle(
        "PendingTitle", parent=styles["Normal"], fontName=sans_b, fontSize=9.3, leading=12.5,
        textColor=terracotta, spaceAfter=3
    )
    s_footer = ParagraphStyle(
        "Footer", parent=styles["Normal"], fontName=sans, fontSize=8.5, leading=11.5,
        textColor=ink_muted
    )

    story = []

    # Top accent bar
    story.append(HRFlowable(width="100%", thickness=2.5, color=forest, spaceBefore=0, spaceAfter=8))

    # Header
    story.append(Paragraph("IXMA OPERATIONS  ·  DOCUMENTACIÓN DE AVANCES Y ENTREGAS", s_brand))
    story.append(Paragraph("Estado de Implementación por Área — Studio Domus y Domus Works", s_title))
    story.append(Paragraph("23 de noviembre de 2026   |   Preparado por Emilio Ramirez   |   Registro según bitácora del portal", s_meta))
    story.append(HRFlowable(width="100%", thickness=0.6, color=hairline, spaceBefore=0, spaceAfter=8))

    # Intro
    story.append(
        Paragraph(
            "Este documento resume lo que se ha configurado, entregado y puesto en marcha con cada equipo hasta la fecha. "
            "Todas las consultas y correos recibidos ya fueron atendidos y respondidos, y la mayoría de las herramientas, "
            "soluciones y recomendaciones comprometidas ya fueron entregadas (en algunos casos a la espera de respuesta o validación "
            "de los líderes). Al cierre se detallan los equipos en desarrollo y los seguimientos pendientes.",
            s_body,
        )
    )

    # Section 1: Documentation by Team
    story.append(Paragraph("1. Lo configurado y entregado por equipo", s_h1))

    def add_team_block(title, tag, bullets, is_dev=False):
        hdr_tbl = Table(
            [[Paragraph(title, s_team_title), Paragraph(tag, s_team_tag_dev if is_dev else s_team_tag)]],
            colWidths=[5.1 * inch, 2.1 * inch],
        )
        hdr_tbl.setStyle(
            TableStyle([
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
            ])
        )
        items = [hdr_tbl]
        for b in bullets:
            items.append(Paragraph(f"• {b}", s_bullet))
        items.append(HRFlowable(width="100%", thickness=0.45, color=hairline, spaceBefore=3, spaceAfter=6))
        story.append(KeepTogether(items))

    add_team_block(
        "BIM / VDC",
        "Entregado y en ejecución (5 de 6)",
        [
            "<b>Suite BlueprintQA publicada en el portal:</b> Se compilaron y subieron los instaladores para Windows y macOS junto con el prompt de auditoría de planos ejecutivos en texto plano (<b>BIM-3</b> reactivado).",
            "<b>Estandarización e interoperabilidad:</b> Configuración en curso de la hoja maestra única Canva–MET–Revit para eliminar la triple digitación (<b>BIM-1</b>), sincronización modelo Revit–MET (<b>BIM-2</b>), ordenamiento de etiquetas y cotas (<b>BIM-4</b>) y extracción de cantidades hacia el WBS del cliente (<b>BIM-6</b>).",
        ],
    )

    add_team_block(
        "Domus Works y Gestión Digital (Marketing y Diseño)",
        "Tickets atendidos · En ejecución",
        [
            "<b>Atención completa a consultas en el portal (DW-4):</b> Se respondieron los <b>2 tickets</b> enviados por Alejandra Chapas. En el <b>Ticket #1 (Resuelto)</b> se entregó la guía de parámetros en Midjourney (<i>--style raw, --s 100, --iw 2.0</i>), vocabulario óptico real y plantilla modular para evitar estética genérica y deformaciones. En el <b>Ticket #2 (Atendido)</b> se entregó el flujo paso a paso en <b>Adobe Firefly (Boards)</b> usando referencias de Adobe Stock y tokens fotográficos para pieles y tonos naturales en personas, actualizando la documentación de DW-4.",
            "<b>Flujos de contenido y producción:</b> Puesta en marcha de asistentes de copy mensual con diccionarios negativos (<b>DW-2, GD-2</b>), lineamientos de higiene y modo relajado en Midjourney (<b>DW-3</b>), consistencia de personajes en video (<b>DW-5</b>), matriz/esqueleto de contenido (<b>GD-3</b>) y apoyo inicial en estrategia de marca (<b>GD-4</b>).",
        ],
    )

    add_team_block(
        "Contabilidad y Administración (Admin)",
        "Configuraciones entregadas",
        [
            "<b>Entrega y configuraciones enviadas:</b> Con los insumos recibidos se desbloqueó <b>CT-1</b> (conversión de facturas FEL y recibos hacia Excel y Aspel) y se enviaron las configuraciones correspondientes al equipo, incluyendo captura del tipo de cambio oficial SAT/Banguat (<b>CT-2</b>), tabla maestra de entidades legales con validación automática de NIT (<b>CT-3</b>), lineamientos de privacidad financiera (<b>CT-4</b>) y criterios de verificación legal (<b>CT-5</b>).",
        ],
    )

    add_team_block(
        "Construcción y Operaciones",
        "Configuraciones entregadas",
        [
            "<b>Control presupuestario, compras y manuales:</b> Se entregaron y enviaron por correo las configuraciones para el control preventivo de sobrecostos de presupuesto (<b>CON-2</b>), el flujo de automatización para órdenes de compra (<b>CON-3</b>) y la estructuración del Manual de calidad y garantías (<b>CON-1</b>).",
        ],
    )

    add_team_block(
        "Gerencia de Proyectos (PM Studio Domus)",
        "3 herramientas configuradas",
        [
            "<b>Sistematización de minutas y agendas:</b> Configuración del asistente de actas con plantilla estándar y glosario técnico de construcción guatemalteco (<b>GP-1</b>), habilitación de captura de reuniones presenciales y en obra desde celular (<b>GP-2</b>) y configuración de enlaces de citas directos en Google Calendar (<b>GP-3</b>).",
        ],
    )

    add_team_block(
        "Diseño de Interiores",
        "3 soluciones en marcha",
        [
            "<b>Control visual y conceptualización:</b> Activación de directrices para edición de renders interiores sin deformar la geometría del espacio (<b>INT-1</b>), esquema de sesiones ordenadas para evitar pérdida de contexto en chats largos (<b>INT-2</b>) y aceleración de storytelling, naming y moodboards conceptuales (<b>INT-3</b>).",
        ],
    )

    add_team_block(
        "Recursos Humanos (RR.HH.)",
        "2 iniciativas en marcha + Propuesta",
        [
            "<b>Asistencia, vacaciones y monitoreo de equipos:</b> Trabajo activo en la validación de marcajes biométricos incompletos y ciclos sin cerrar (<b>RH-1</b>) y en la digitalización del flujo de aprobación de vacaciones (<b>RH-4</b>), acompañado de la propuesta técnica de extensión de alcance para monitoreo de uso de laptops corporativas (evaluación de Insightful).",
        ],
    )

    # Section 2: Pending / Still Needs Addressing (at the end)
    story.append(Paragraph("2. Lo que sigue en desarrollo y puntos pendientes por atender", s_h1_pending))

    pending_box = Table(
        [[
            [
                Paragraph("A) Soluciones actualmente en desarrollo interno (ajuste de calidad antes de entrega)", s_pending_title),
                Paragraph(
                    "• <b>Ventas (Studio Domus / Comercial):</b> Desarrollo interno de flujos para detección de mudanzas corporativas (<b>VE-2</b>) y prospección de desarrolladoras en Etapa 0 (<b>VE-3</b>).",
                    s_bullet,
                ),
                Paragraph(
                    "• <b>Arquitectura:</b> Desarrollo y afinación de plantillas y flujos para pre-dimensionamiento y mezcla de unidades (<b>ARQ-1</b>).",
                    s_bullet,
                ),
                Spacer(1, 4),
                Paragraph("B) Puntos a la espera de respuesta, feedback o insumos de los equipos", s_pending_title),
                Paragraph(
                    "• <b>Respuesta a configuraciones enviadas (Contabilidad y Construcción):</b> Se entregaron las configuraciones por correo a ambos equipos y se está a la espera de su respuesta para validar la implementación.",
                    s_bullet,
                ),
                Paragraph(
                    "• <b>Equipos sin feedback ni consultas recientes:</b> En otras áreas con entregas o recomendaciones ya compartidas no se han recibido comentarios ni consultas adicionales hasta el momento.",
                    s_bullet,
                ),
                Paragraph(
                    "• <b>Construcción (CON-4):</b> Recibir la tabla de clasificación de tiempo/dedicación para activar la medición de tareas.",
                    s_bullet,
                ),
                Paragraph(
                    "• <b>Gerencia de Proyectos (GP-4):</b> A la espera de confirmación de implementación para conectar la asignación automática de acuerdos en Monday.com.",
                    ParagraphStyle("BulletLast", parent=s_bullet, spaceAfter=0),
                ),
            ]
        ]],
        colWidths=[7.2 * inch],
    )
    pending_box.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), amber_bg),
            ("LINEBEFORE", (0, 0), (0, -1), 2.5, terracotta),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 11),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ])
    )
    story.append(KeepTogether([pending_box]))
    story.append(Spacer(1, 10))

    # Footer signature
    story.append(
        Paragraph(
            "<b>Emilio Ramírez</b>  ·  Consultor Principal, IxMa Operations  ·  eramirez@ixmaoperations.com",
            s_footer,
        )
    )

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"PDF generated: {os.path.abspath(output_path)}")


if __name__ == "__main__":
    build_pdf()
