# Controle do São João - Família Viana Gomes 🔥🌽

Aplicativo web completo para controle de participantes, comidas, despesas e cálculo financeiro automático para o São João da Família Viana Gomes.

## Tecnologias Utilizadas
- **Back-end**: Node.js com Express.js, JWT (Autenticação) e Banco de Dados JSON local.
- **Front-end**: HTML5 semântico, Vanilla CSS3 (Tema Junino Premium) e Javascript Vanilla (ES6).

---

## Como Executar o Aplicativo

### 1. Pré-requisitos
- Node.js instalado (versão 16.x ou superior recomendada).

### 2. Configuração (Opcional)
No arquivo `.env` localizado na raiz do projeto, você pode configurar a porta de execução e a senha do administrador:
```env
PORT=3000
ADMIN_PASSWORD=sua_senha_aqui
JWT_SECRET=sua_chave_secreta
```
*Por padrão, a senha do administrador está configurada como **`viana123`***.

### 3. Instalação e Inicialização
No terminal, na pasta do projeto, execute:

```bash
# Instalar as dependências (caso não tenham sido instaladas)
npm install

# Iniciar o servidor
npm start
```

O servidor estará rodando em: **[http://localhost:3000](http://localhost:3000)**. Abra esse link no seu navegador.

---

## Regras de Negócio Implementadas

1. **Participantes (Público)**:
   - Qualquer pessoa não autenticada pode adicionar um nome à lista.
   - O formulário pergunta se o participante é **menor de 15 anos (criança)**.
   - Se for criança, o participante é marcado como **Isento**, não possui status de pagamento e não entra na divisão financeira de custos.
   - Se for adulto, o participante entra na lista com o status de pagamento padrão **Pendente**.

2. **Administração (Restrito)**:
   - Clique em **"Área do Admin"** no cabeçalho e digite a senha configurada (padrão: `viana123`).
   - Com o painel admin ativo:
     - Você pode alterar o status de pagamento dos adultos clicando no badge **Pendente / Confirmado** diretamente na lista.
     - Pode remover participantes clicando no ícone de lixeira.
     - Aparecem formulários adicionais para cadastrar **Comidas/Bebidas** e **Outras Despesas** informando Nome e Preço.
     - Pode mudar o status de comidas (Pendente/Comprado) e despesas (Pendente/Pago) clicando em seus respectivos badges, ou removê-los.

3. **Painel Financeiro (Automático)**:
   - **Despesas Totais**: Calcula a soma de todas as comidas e despesas cadastradas.
   - **Adultos Pagantes**: Conta quantos participantes adultos estão cadastrados (excluindo crianças).
   - **Custo por Adulto**: Divide o valor total de despesas igualmente entre a quantidade de adultos pagantes.
   - **Total Arrecadado**: Multiplica a quantidade de adultos com pagamento **Confirmado** pelo custo individual calculado, mostrando quanto do dinheiro já foi recolhido.
