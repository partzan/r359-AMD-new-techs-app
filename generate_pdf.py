import re
import os
from fpdf import FPDF

class GitGuidePDF(FPDF):
    def header(self):
        # Draw a beautiful dark red stripe at the top (AMD Brand Color)
        self.set_fill_color(230, 0, 18)
        self.rect(0, 0, 210, 6, "F")
        
        # Header text
        self.set_font("helvetica", "B", 8)
        self.set_text_color(100, 110, 120)
        self.cell(0, 12, "GIT VS GITHUB: REFERENCE GUIDE", border=0, align="R")
        self.ln(12)
        
        # Draw a thin gray line below the header text
        self.set_draw_color(220, 224, 230)
        self.set_line_width(0.2)
        self.line(20, 18, 190, 18)
        
    def footer(self):
        # Position at 15 mm from bottom
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        # Page number
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def render_title_section(self, title, subtitle):
        self.set_y(22)
        self.set_font("helvetica", "B", 18)
        self.set_text_color(230, 0, 18)
        self.multi_cell(0, 8, title, align="L")
        self.ln(2)
        
        self.set_font("helvetica", "", 10)
        self.set_text_color(80, 90, 100)
        self.multi_cell(0, 5.5, subtitle, align="L")
        self.ln(6)
        
    def render_section_header(self, title):
        self.ln(4)
        self.set_font("helvetica", "B", 13)
        self.set_text_color(230, 0, 18)
        self.cell(0, 8, title, border=0, align="L")
        self.ln(8)
        
        # Accent bar under the section title
        y = self.get_y() - 2
        self.set_draw_color(230, 0, 18)
        self.set_line_width(1.5)
        self.line(20, y, 60, y)
        self.ln(4)

    def render_bullet_point(self, text_line):
        clean_text = text_line[2:].strip()
        
        # Draw the bullet square
        y = self.get_y()
        self.set_fill_color(230, 0, 18)
        self.rect(22, y + 1.5, 2.5, 2.5, "F")
        
        # Temporarily set left margin to 28 for indent wrapping
        self.set_left_margin(28)
        self.set_x(28)
        
        parts = clean_text.split(" is ", 1)
        if len(parts) == 2:
            keyword = parts[0]
            rest = " is " + parts[1]
            
            self.set_font("helvetica", "B", 10)
            self.set_text_color(33, 37, 41)
            self.write(5, keyword)
            
            self.set_font("helvetica", "", 10)
            self.set_text_color(60, 65, 70)
            self.write(5, rest)
            self.ln(7)
        else:
            self.set_font("helvetica", "", 10)
            self.set_text_color(60, 65, 70)
            self.write(5, clean_text)
            self.ln(7)
            
        # Restore left margin
        self.set_left_margin(20)

    def render_blockquote(self, text):
        self.ln(2)
        y_start = self.get_y()
        
        self.set_left_margin(25)
        self.set_x(25)
        
        self.set_font("helvetica", "I", 10.5)
        self.set_text_color(230, 0, 18)
        self.multi_cell(0, 5.5, text)
        
        y_end = self.get_y()
        
        # Draw left border line
        self.set_draw_color(230, 0, 18)
        self.set_line_width(1.5)
        self.line(22, y_start, 22, y_end - 1.5)
        
        self.set_left_margin(20)
        self.ln(4)

    def render_step(self, step_num, step_title, step_type, command, action, explanation):
        self.ln(3)
        # Prevent page breaks in the middle of a step block if height is tight
        needed_height = 15
        if command:
            # roughly estimate lines of command
            needed_height += 15
        if explanation:
            needed_height += 15
            
        if self.get_y() + needed_height > 270:
            self.add_page()
            
        # Step header
        self.set_font("helvetica", "B", 11)
        self.set_text_color(33, 37, 41)
        self.write(6, f"STEP {step_num}: {step_title} ")
        
        # Operation badge
        self.set_font("helvetica", "B", 8)
        if "Git" in step_type:
            self.set_text_color(230, 0, 18) # Red for Git
        else:
            self.set_text_color(16, 185, 129) # Green/Teal for GitHub
        self.write(6, f"({step_type})")
        self.ln(7)
        
        # Command box
        if command:
            self.set_fill_color(245, 246, 248)
            self.set_draw_color(220, 224, 230)
            self.set_line_width(0.2)
            
            self.set_font("courier", "B", 9.5)
            self.set_text_color(40, 44, 52)
            
            self.set_x(25)
            self.multi_cell(165, 6, command, border=1, fill=True)
            self.ln(2)
            
        # Action box
        if action:
            self.set_font("helvetica", "I", 9.5)
            self.set_text_color(80, 80, 80)
            self.set_x(25)
            self.multi_cell(165, 5, f"Action: {action}")
            self.ln(2)
            
        # Explanation paragraph
        if explanation:
            self.set_font("helvetica", "", 10)
            self.set_text_color(70, 75, 80)
            self.set_x(25)
            self.multi_cell(165, 5, explanation)
            self.ln(4)

def parse_guide():
    with open("guide.txt", "r", encoding="utf-8") as f:
        text = f.read()
        
    title_match = re.search(r"^(.*?)\n=+", text, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else "GIT VS GITHUB GUIDE"
    
    desc_match = re.search(r"=+\n\n(.*?)\n\n-", text, re.DOTALL)
    subtitle = desc_match.group(1).strip() if desc_match else ""
    
    sec1_match = re.search(r"1\. THE FUNDAMENTAL DIFFERENCE: GIT VS GITHUB\s*-+\s*\n(.*?)\n-+\s*\n2\. STEP-BY-STEP", text, re.DOTALL)
    sec1_content = sec1_match.group(1).strip() if sec1_match else ""
    
    bullets = []
    quote = ""
    for line in sec1_content.split("\n"):
        line = line.strip()
        if line.startswith("*"):
            bullets.append(line)
        elif line.startswith("In short:"):
            quote = line
            
    sec2_match = re.search(r"2\. STEP-BY-STEP OPERATION LOG\s*-+\s*\n(.*)$", text, re.DOTALL)
    sec2_content = sec2_match.group(1).strip() if sec2_match else ""
    
    step_blocks = re.split(r"\n(?=STEP \d+:)", sec2_content)
    steps = []
    
    for block in step_blocks:
        block = block.strip()
        if not block:
            continue
        lines = block.split("\n")
        header_line = lines[0].strip()
        
        h_match = re.match(r"STEP (\d+):\s*(.*?)\s*\((.*?)\)", header_line)
        if not h_match:
            continue
            
        step_num = h_match.group(1)
        step_title = h_match.group(2)
        step_type = h_match.group(3)
        
        command = ""
        action = ""
        explanation = ""
        
        body_lines = [l.strip() for l in lines[2:] if l.strip()]
        body_text = "\n".join(body_lines)
        
        if "Command:" in body_text:
            cmd_match = re.search(r"Command:\s*\n?\s*(.*?)(?=\nExplanation:|$)", body_text, re.DOTALL)
            if cmd_match:
                command = cmd_match.group(1).strip()
            
            exp_match = re.search(r"Explanation:\s*\n?\s*(.*)$", body_text, re.DOTALL)
            if exp_match:
                explanation = exp_match.group(1).strip()
        elif "Action:" in body_text:
            act_match = re.search(r"Action:\s*\n?\s*(.*)$", body_text, re.DOTALL)
            if act_match:
                action = act_match.group(1).strip()
        else:
            explanation = body_text.strip()
            
        steps.append({
            "num": step_num,
            "title": step_title,
            "type": step_type,
            "command": command,
            "action": action,
            "explanation": explanation
        })
        
    return {
        "title": title,
        "subtitle": subtitle,
        "bullets": bullets,
        "quote": quote,
        "steps": steps
    }

def main():
    data = parse_guide()
    
    pdf = GitGuidePDF(orientation="P", unit="mm", format="A4")
    pdf.set_margins(20, 20, 20)
    pdf.set_auto_page_break(True, margin=20)
    pdf.add_page()
    
    # Title Section
    pdf.render_title_section(data["title"], data["subtitle"])
    
    # Section 1
    pdf.render_section_header("1. THE FUNDAMENTAL DIFFERENCE: GIT VS GITHUB")
    for bullet in data["bullets"]:
        pdf.render_bullet_point(bullet)
    if data["quote"]:
        pdf.render_blockquote(data["quote"])
        
    # Section 2
    pdf.render_section_header("2. STEP-BY-STEP OPERATION LOG")
    for step in data["steps"]:
        pdf.render_step(
            step["num"],
            step["title"],
            step["type"],
            step["command"],
            step["action"],
            step["explanation"]
        )
        
    # Output the PDF to root and static directory
    pdf.output("guide.pdf")
    print("Generated guide.pdf in root directory.")
    
    static_dir = os.path.join("static")
    if not os.path.exists(static_dir):
        os.makedirs(static_dir)
        
    pdf.output(os.path.join(static_dir, "guide.pdf"))
    print("Generated guide.pdf in static directory.")

if __name__ == "__main__":
    main()
