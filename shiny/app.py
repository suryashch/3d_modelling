from shiny import App, Inputs, ui, render
from shiny.module import resolve_id
from shiny.render.renderer import Renderer
from pathlib import Path
import json

import pandas as pd

from htmltools import HTMLDependency

MODELS_DIR = Path(__file__).parent / "data" / "models"

map_config = {
    "imports": {
        "three": "https://unpkg.com/three@0.184.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.184.0/examples/jsm/",
        "three-mesh-bvh": "https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.9.10/build/index.module.js"
    }
}

# 2. Construct the HTML script tag
import_map_tag = ui.tags.script(
    ui.HTML(json.dumps(map_config)),
    type="importmap"
)

# config_json = json.dumps(map_config)

viewer_dep = HTMLDependency(
    "qs_viewer",
    "5.5.2",
    source={"subdir": "qs_viewer"},
    script={"src": "qs_viewer_binding.js", "type": "module"},
    stylesheet={"href": "index.css"},
    all_files=True
    # head=import_map_tag
)

def output_viewer(id, height="200px"):
    return ui.div(
        viewer_dep,
        # Use resolve_id so that our component will work in a module
        id=resolve_id(id),
        class_="shiny-qsviewer-output",
        style=f"height: {height}",
    )

class render_viewer(Renderer[dict]):
    def auto_output_ui(self):
        return output_viewer(self.output_name)

app_ui = ui.page_navbar(
    ui.head_content(
        import_map_tag
    ),
    
    ui.nav_panel(
        "Model",
        output_viewer("test_function")
    ),
)

def server(input: Inputs):
   @render_viewer
   def test_function():
       pass
    # pass

# app = App(app_ui, server, static_assets=www_dir)

# app.py (Shiny Core Example)
# from shiny import App, render, ui

# Explicit UI definition
# app_ui = ui.page_fluid(
#     ui.input_slider("num", "Choose a number:", min=1, max=100, value=50),
#     ui.output_text("display_val")
# )

# test_df = pd.read_csv('data/test_input_data.csv')


# app_ui = ui.page_navbar(
#     ui.nav_panel(
#         "Output",
#         ui.output_text("render_summary")
#     ),
#     ui.nav_panel(
#         "Dataframe",
#         ui.output_data_frame("render_df")
#     )
# )

# # Explicit Server function logic
# def server(input, output, session):
#     @render.text
#     def display_val():
#         return f"You selected the value: {input.num()}"
    
#     @render.data_frame
#     def render_df():
#         return render.DataGrid(test_df, filters=True)
    
#     @render.text
#     def render_summary():
#         current_df = render_df.data_view()
#         return list(current_df["uid"])

# # Binding them together into an App object
app = App(app_ui, server, static_assets=MODELS_DIR)