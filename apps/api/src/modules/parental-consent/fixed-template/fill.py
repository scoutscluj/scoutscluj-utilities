"""Fill a trusted, versioned OOXML template. No user supplied XML or paths."""
import copy
from io import BytesIO
import json
from pathlib import Path
import re
import sys
import zipfile
from lxml import etree as ET

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS = {'w': W}
for prefix, uri in [('w', W), ('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'),
                    ('a', 'http://schemas.openxmlformats.org/drawingml/2006/main'),
                    ('wp', 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'),
                    ('pic', 'http://schemas.openxmlformats.org/drawingml/2006/picture')]:
    ET.register_namespace(prefix, uri)


def text(node):
    return ''.join(t.text or '' for t in node.findall('.//w:t', NS))


def set_text(paragraph, value):
    properties = paragraph.find('w:pPr', NS)
    run_properties = paragraph.find('.//w:rPr', NS)
    for child in list(paragraph):
        if child is not properties:
            paragraph.remove(child)
    run = ET.SubElement(paragraph, f'{{{W}}}r')
    if run_properties is not None:
        run.append(copy.deepcopy(run_properties))
    for i, line in enumerate(str(value).split('\n')):
        if i:
            ET.SubElement(run, f'{{{W}}}br')
        node = ET.SubElement(run, f'{{{W}}}t')
        node.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        node.text = line


def cell_text(cell, value):
    paragraphs = cell.findall('w:p', NS)
    set_text(paragraphs[0], value)
    for paragraph in paragraphs[1:]:
        cell.remove(paragraph)


def prepare(root):
    tables = root.findall('.//w:tbl', NS)
    # Match the reference's four information pages followed by the two form pages.
    divider = ET.Element(f'{{{W}}}p')
    properties = ET.SubElement(divider, f'{{{W}}}pPr')
    ET.SubElement(properties, f'{{{W}}}pageBreakBefore')
    ET.SubElement(properties, f'{{{W}}}spacing', {f'{{{W}}}line': '1', f'{{{W}}}lineRule': 'exact', f'{{{W}}}after': '0'})
    tables[1].addprevious(divider)
    for paragraph in root.findall('.//w:p', NS):
        if text(paragraph).startswith(('1.5. Riscuri', '2.4. Fotografiere')):
            properties = paragraph.find('w:pPr', NS)
            if properties is None:
                properties = ET.Element(f'{{{W}}}pPr')
                paragraph.insert(0, properties)
            ET.SubElement(properties, f'{{{W}}}pageBreakBefore')
    essential = ['organization', 'representative', 'coordinators', 'title', 'period', 'location', 'communication']
    for row, key in zip(tables[0].findall('w:tr', NS), essential):
        cell_text(row.findall('w:tc', NS)[1], '{{activity.' + key + '}}')
    common_start = False
    for parent in root.iter():
        for paragraph in list(parent):
            if paragraph.tag != f'{{{W}}}p':
                continue
            value = text(paragraph)
            if value == 'Activități comune':
                common_start = True
            elif common_start and value and not value.startswith('Activități specifice'):
                set_text(paragraph, '{{activity.commonActivities}}')
                common_start = False
            elif value in [
                'ateliere creative și practice;',
                'construcții de camp din lemn și frânghie, adaptate vârstei;',
                'activități de dezvoltare a abilităților practice și de viață în natură;',
                'activități sociale, intelectuale și educative;',
                'waterslide și alte jocuri cu apă, exclusiv în condiții meteorologice și de siguranță adecvate;',
                'construirea unei plute ca exercițiu practic; pluta nu va fi folosită pentru transportarea participanților.',
            ]:
                parent.remove(paragraph)
            elif value.startswith('La plecare, transportul'):
                set_text(paragraph, '{{activity.outboundTransport}}')
            elif value.startswith('La întoarcere, participanții'):
                set_text(paragraph, '{{activity.returnTransport}}')
            elif value.startswith('Pentru temerari și exploratori, briceagul'):
                set_text(paragraph, '{{activity.equipmentNotes}}')
            elif value.startswith('Gabriel Boer'):
                set_text(paragraph, '{{activity.firstAidPeople}}')
            elif value.startswith('Claudia Roca'):
                parent.remove(paragraph)
            elif value.startswith('Spitalul Orășenesc Câmpeni'):
                set_text(paragraph, '{{activity.medicalFacilities}}')
            elif value.startswith('Spitalul Județean de Urgență Alba') or value.startswith('unitate de urgențe pediatrice'):
                parent.remove(paragraph)
            elif 'Câmpul de Centru Local Gălăgaia' in value:
                set_text(paragraph, '{{activity.title}}')
    cells = tables[1].findall('.//w:tc', NS)
    for cell, heading, key in zip(cells, ['Activități specifice participanților', 'Precizări privind activitățile'], ['specificActivities', 'activityNotes']):
        paragraphs = cell.findall('w:p', NS)
        set_text(paragraphs[0], heading)
        set_text(paragraphs[1], '{{activity.' + key + '}}')
        for paragraph in paragraphs[2:]:
            cell.remove(paragraph)
    equipment_rows = tables[2].findall('w:tr', NS)
    for index, cell in enumerate(tables[2].findall('.//w:tc', NS)):
        cell_text(cell, '{{equipment.' + str(index) + '}}')
    # Keep two columns, expand at fill time when a longer equipment list is supplied.
    field_rows = {
        4: ['participant_name', 'birth_date', 'branch'],
        5: ['guardian_name', 'guardian_relation_label', 'guardian_phone', 'secondary_phone', 'emergency_name', 'emergency_phone'],
        7: ['participant_name'],
        10: ['medication', 'medication_dose', 'medication_reason', 'medication_storage', 'medication_instructions'],
        12: ['guardian_name', 'signature_date', 'signature_blank'],
    }
    for index, fields in field_rows.items():
        for row, field in zip(tables[index].findall('w:tr', NS), fields):
            cell_text(row.findall('w:tc', NS)[1], '{{answer.' + field + '}}')
    cell_text(tables[9].find('.//w:tc', NS), '{{answer.medical_details}}')
    for paragraph in root.findall('.//w:p', NS):
        value = text(paragraph)
        if value.startswith('○ Urmez planul'):
            set_text(paragraph, value.replace('○', '{{choice.transport.branch}}', 1))
        elif value.startswith('○ Asigur transportul'):
            set_text(paragraph, value.replace('○', '{{choice.transport.personal}}', 1))
        elif value.startswith('○ Sunt de acord cu administrarea'):
            set_text(paragraph, value.replace('○', '{{choice.treatment.approved}}', 1))
        elif value.startswith('○ Sunt de acord cu tratamentul'):
            set_text(paragraph, value.replace('○', '{{choice.treatment.call_first}}', 1))
        elif value.startswith('○ Nu sunt de acord cu administrarea'):
            set_text(paragraph, value.replace('○', '{{choice.treatment.no}}', 1))
        elif value.startswith('☐ Confirm că sunt reprezentantul'):
            set_text(paragraph, value.replace('☐', '{{check.acknowledgement}}', 1))
        elif value.startswith('Există informații medicale'):
            set_text(paragraph, value.replace('○ Nu', '{{choice.medical_relevant.no}} Nu').replace('○ Da', '{{choice.medical_relevant.yes}} Da'))
        elif value.startswith('Participantul are medicație'):
            set_text(paragraph, value.replace('○ Nu', '{{choice.has_medication.no}} Nu').replace('○ Da', '{{choice.has_medication.yes}} Da'))
        elif value.startswith('Mod de administrare:'):
            set_text(paragraph, value.replace('○ autonom', '{{choice.medication_mode.self}} autonom').replace('○ cu supraveghere', '{{choice.medication_mode.supervised}} cu supraveghere').replace('○ de personal medical', '{{choice.medication_mode.medical}} de personal medical'))
        elif value.startswith('☐ Nu sunt de acord cu nicio utilizare'):
            set_text(paragraph, value.replace('☐', '{{check.photo_none}}', 1))
    for cell, code in zip(tables[8].findall('.//w:tc', NS), ['allergies', 'support', 'anaphylaxis', 'diet', 'conditions', 'other', 'effort']):
        for paragraph in cell.findall('w:p', NS):
            if '☐' in text(paragraph):
                set_text(paragraph, text(paragraph).replace('☐', '{{medical.' + code + '}}', 1))
    for cell, code in zip(tables[11].findall('.//w:tc', NS), ['archive', 'social', 'closed_groups', 'print', 'website', 'partners']):
        paragraph = cell.find('w:p', NS)
        set_text(paragraph, text(paragraph).replace('☐', '{{photo.' + code + '}}', 1))


def transform(source, destination, values=None):
    with zipfile.ZipFile(source) as original, zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as output:
        for item in original.infolist():
            data = original.read(item.filename)
            if item.filename in ['word/document.xml', 'word/styles.xml', 'word/theme/theme1.xml'] or re.fullmatch(r'word/(header|footer)\d+\.xml', item.filename):
                root = ET.fromstring(data, ET.XMLParser(resolve_entities=False, no_network=True))
                if values is not None:
                    # Explicit, installed Calibri-compatible metrics; avoid wide DejaVu fallback.
                    for node in root.iter():
                        for key, value in list(node.attrib.items()):
                            if value in ['Aptos', 'Aptos Display', 'Calibri', 'Calibri Light']:
                                node.set(key, 'Carlito')
                    if item.filename == 'word/document.xml':
                        for height in root.findall('.//w:trHeight', NS):
                            height.set(f'{{{W}}}hRule', 'atLeast')
                        for no_split in root.findall('.//w:cantSplit', NS):
                            no_split.getparent().remove(no_split)
                if values is None and item.filename == 'word/document.xml':
                    prepare(root)
                for paragraph in root.findall('.//w:p', NS):
                    value = text(paragraph)
                    if values is None and 'Cântul Vâlvelor 2026' in value:
                        # Keep native PAGE/NUMPAGES fields and run formatting in footers.
                        for node in paragraph.findall('.//w:t', NS):
                            node.text = (node.text or '').replace('Cântul Vâlvelor 2026', '{{activity.shortTitle}}').replace('Temerari și exploratori', '{{answer.branch}}')
                    elif values is not None and '{{' in value:
                        replaced = re.sub(r'\{\{([^{}]+)\}\}', lambda match: str(values.get(match.group(1), '')), value)
                        # Footers include page number field codes: replace only token text runs.
                        if item.filename.startswith('word/footer'):
                            for node in paragraph.findall('.//w:t', NS):
                                node.text = re.sub(r'\{\{([^{}]+)\}\}', lambda match: str(values.get(match.group(1), '')), node.text or '')
                        else:
                            set_text(paragraph, replaced)
                if values is not None and item.filename == 'word/document.xml' and values.get('appendix'):
                    body = root.find('w:body', NS)
                    section = body.find('w:sectPr', NS)
                    index = list(body).index(section)
                    heading = ET.Element(f'{{{W}}}p')
                    properties = ET.SubElement(heading, f'{{{W}}}pPr')
                    ET.SubElement(properties, f'{{{W}}}pageBreakBefore')
                    set_text(heading, 'Informații suplimentare pentru activitate')
                    body.insert(index, heading)
                    paragraph = ET.Element(f'{{{W}}}p')
                    set_text(paragraph, values['appendix'])
                    body.insert(index + 1, paragraph)
                data = ET.tostring(root, encoding='utf-8', xml_declaration=True)
            if item.filename == 'docProps/core.xml':
                root = ET.fromstring(data, ET.XMLParser(resolve_entities=False, no_network=True))
                for node in root:
                    if node.tag.endswith(('creator', 'lastModifiedBy', 'title', 'subject')):
                        node.text = 'Scouts Cluj'
                data = ET.tostring(root, encoding='utf-8', xml_declaration=True)
            output.writestr(item, data)


def add_signature(path):
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import DictionaryObject, NameObject, ArrayObject, NumberObject, TextStringObject, FloatObject, DecodedStreamObject
    from reportlab.pdfgen.canvas import Canvas
    from reportlab.lib.utils import ImageReader
    writer = PdfWriter()
    writer.clone_document_from_reader(PdfReader(path))
    # LibreOffice can omit a table header on continued pages. Stamp the three
    # trusted embedded logos at the exact reference PDF coordinates on every page.
    overlay = BytesIO()
    canvas = Canvas(overlay, pagesize=(612, 792))
    canvas.setFillColorRGB(1, 1, 1)
    canvas.rect(0, 690, 612, 102, fill=1, stroke=0)
    positions = [(56.9, 707.63, 44.6, 47.573), (225.57, 706.66, 161.25, 49.5), (499.35, 703.78, 56.134, 55.25)]
    with zipfile.ZipFile(Path(__file__).with_name('participation.docx')) as template:
        for index, position in enumerate(positions, start=1):
            canvas.drawImage(ImageReader(BytesIO(template.read(f'word/media/image{index}.png'))), *position, mask='auto')
    canvas.save()
    overlay.seek(0)
    header = PdfReader(overlay).pages[0]
    for page in writer.pages:
        page.merge_page(header)
    anchor = []
    for index, page in enumerate(writer.pages):
        def visit(value, cm, tm, font, size):
            if 'Semnătură digitală' in value:
                anchor.append((index, float(tm[5])))
        page.extract_text(visitor_text=visit)
    if not anchor:
        raise ValueError('Signature area not found')
    index, baseline = anchor[-1]
    page = writer.pages[index]
    rectangle = [201.8, baseline - 7.5, 551, baseline + 12.2]
    appearance = DecodedStreamObject()
    appearance.set_data(b'q Q')
    appearance.update({NameObject('/Type'): NameObject('/XObject'), NameObject('/Subtype'): NameObject('/Form'), NameObject('/BBox'): ArrayObject([FloatObject(v) for v in [0, 0, 349.2, 19.7]]), NameObject('/Resources'): DictionaryObject()})
    field = DictionaryObject({
        NameObject('/Type'): NameObject('/Annot'), NameObject('/Subtype'): NameObject('/Widget'),
        NameObject('/FT'): NameObject('/Sig'), NameObject('/T'): TextStringObject('digital_signature'),
        NameObject('/TU'): TextStringObject('Semnătura digitală a reprezentantului legal'),
        NameObject('/Rect'): ArrayObject([FloatObject(v) for v in rectangle]), NameObject('/F'): NumberObject(4),
        NameObject('/P'): page.indirect_reference,
        NameObject('/AP'): DictionaryObject({NameObject('/N'): writer._add_object(appearance)}),
        NameObject('/Lock'): DictionaryObject({NameObject('/Type'): NameObject('/SigFieldLock'), NameObject('/Action'): NameObject('/All')}),
    })
    reference = writer._add_object(field)
    page.setdefault(NameObject('/Annots'), ArrayObject()).append(reference)
    form = writer.root_object.get('/AcroForm')
    if form is None:
        form = DictionaryObject()
        writer.root_object[NameObject('/AcroForm')] = writer._add_object(form)
    else:
        form = form.get_object()
    form.setdefault(NameObject('/Fields'), ArrayObject()).append(reference)
    form[NameObject('/SigFlags')] = NumberObject(3)
    destination = Path(path).with_suffix('.with-signature.pdf')
    with destination.open('wb') as stream:
        writer.write(stream)
    fields = PdfReader(destination).get_fields()
    if fields['digital_signature']['/FT'] != '/Sig' or '/V' in fields['digital_signature']:
        raise ValueError('Invalid unsigned signature field')
    destination.replace(path)


if __name__ == '__main__':
    if sys.argv[1] == '--prepare':
        transform(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == '--signature':
        add_signature(sys.argv[2])
    else:
        values = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
        transform(Path(__file__).with_name('participation.docx'), sys.argv[2], values)
