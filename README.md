# Wolf Troubleshooting de Alertas e Falhas

Projeto de troubleshooting offline para consulta técnica de alertas, falhas, causas, efeitos, soluções e diagnóstico guiado.

## Arquitetura

A planilha Excel é o banco de dados pai do projeto.

Fluxo:

```text
Base_Pai_Troubleshooting_Alertas_Falhas_MVP.xlsx
        ↓
gerar_json_troubleshooting.py
        ↓
dados_troubleshooting.json
        ↓
Página Web Offline