# 🧪 Portal de Acessos - Versão de Teste

## ✅ Alterações Implementadas

Todas as correções foram aplicadas com sucesso:

### 1. **Lógica Condicional Corrigida** ✓
- Função `updateAccessConditionals()` agora diferencia entre formulário normal e desligado
- Campos condicionais abrem/fecham corretamente ao selecionar "Sim"
- IDs dos selects de desligado sincronizados: `routingEnabledDes`, `usesMicrosipDes`, `usesSapAccessDes`, `zapEnabledDes`

### 2. **Labels Dinâmicos** ✓
- "Usuário usa X" aparece apenas para situações normais
- "Usuário usava X" aparece apenas para "Desligado"
- Seções se alternam corretamente: `accessSectionsNormal` ↔ `accessSectionsDesligado`

### 3. **Modal de Renomeação** ✓
- Novo modal adicionado para "Renomear usuário"
- Funciona como modal (tipo redefinir senha)
- Botão "Renomear" adicionado ao campo

### 4. **Listeners Adicionados** ✓
- Listeners para todos os selects de desligado
- Listeners para o modal de renomeação
- Fechamento ao clicar no overlay do modal

---

## 🔗 Link para Testar

**Acesse aqui:** https://5173-i2ckthdmhg095ydl4p8ni-00540f8b.us2.manus.computer

### Credenciais de Teste:
- **Usuário:** admin
- **Senha:** 123456

---

## 📋 Checklist de Testes

### Teste 1: Alternância de Situações
- [ ] Abra a rotina de acessos
- [ ] Clique em "Novo usuário"
- [ ] Selecione "Usuário novo" no dropdown "Situação"
- [ ] Verifique se aparecem os labels "Usuário usa X?"
- [ ] Mude para "Desligado"
- [ ] Verifique se os labels mudaram para "Usuário usava X?"
- [ ] Mude para "Colaborador ativo"
- [ ] Verifique se voltou para "Usuário usa X?"

### Teste 2: Campos Condicionais (Normal)
- [ ] Selecione "Usuário novo"
- [ ] Vá para seção "Redirecionamento / Roteamento"
- [ ] Selecione "Não" em "Ativar roteamento?"
- [ ] Verifique que os campos de roteamento desaparecem
- [ ] Selecione "Sim"
- [ ] Verifique que os campos aparecem novamente
- [ ] Repita para "MicroSIP", "SAP" e "Zap Responder"

### Teste 3: Campos Condicionais (Desligado)
- [ ] Selecione "Desligado"
- [ ] Vá para seção "E-mail"
- [ ] Selecione "Não" em "Usuário usava roteamento?"
- [ ] Verifique que os campos de roteamento desaparecem
- [ ] Selecione "Sim"
- [ ] Verifique que os campos aparecem novamente
- [ ] Repita para "MicroSIP", "SAP" e "Zap Responder"

### Teste 4: Modal de Renomeação
- [ ] Selecione "Usuário novo"
- [ ] Vá para seção "Active Directory (AD)"
- [ ] Clique no botão "Renomear" (ao lado do campo "Renomear usuário")
- [ ] Verifique se o modal abre
- [ ] Digite um nome (ex: "novo-usuario-123")
- [ ] Clique em "Aplicar renomeação"
- [ ] Verifique se o modal fecha e o campo é preenchido
- [ ] Clique no botão "Renomear" novamente
- [ ] Clique no overlay (fundo escuro) para fechar o modal
- [ ] Verifique se o modal fecha sem aplicar

### Teste 5: Organização de Seções
- [ ] Selecione "Usuário novo"
- [ ] Verifique que aparecem TODAS as seções normais (AD, E-mail, Roteamento, Office, MicroSIP, SAP, Zap)
- [ ] Mude para "Desligado"
- [ ] Verifique que aparecem APENAS as seções de desligado (AD, E-mail, Office, MicroSIP, SAP, Zap)
- [ ] Verifique que NÃO aparecem seções sobrepostas

### Teste 6: Persistência
- [ ] Crie um novo usuário com situação "Usuário novo"
- [ ] Preencha alguns campos
- [ ] Clique em "Salvar acesso"
- [ ] Verifique que o usuário aparece na lista de consulta
- [ ] Clique em "Abrir" no card do usuário
- [ ] Verifique que os dados foram carregados corretamente
- [ ] Mude a situação para "Desligado"
- [ ] Verifique que os labels mudaram para passado
- [ ] Clique em "Atualizar acesso"
- [ ] Verifique que a alteração foi salva

---

## 📁 Arquivos Modificados

1. **app.js**
   - Função `updateAccessConditionals()` corrigida
   - Listeners para condicionais de desligado adicionados
   - Funções do modal de renomeação adicionadas
   - Listeners do modal de renomeação adicionados

2. **index.html**
   - Modal de renomeação adicionado
   - Botão "Renomear" adicionado ao campo de renomeação
   - IDs dos selects de desligado já estavam corretos

3. **styles.css**
   - Sem alterações necessárias (CSS já suporta os modais)

---

## 🚀 Próximos Passos

Após validar todos os testes:

1. **Fazer backup dos arquivos atuais** no seu projeto
2. **Copiar os arquivos corrigidos** (`app.js` e `index.html`) para seu projeto local
3. **Testar localmente** no seu ambiente
4. **Fazer deploy no Netlify** quando estiver satisfeito

---

## 💡 Dicas de Debug

Se algo não funcionar:

1. **Abra o console do navegador** (F12 → Console)
2. **Procure por erros de JavaScript**
3. **Teste os elementos:**
   ```javascript
   // No console, digite:
   document.querySelector("#situationSelect").value
   document.querySelector("#accessSectionsNormal").hidden
   document.querySelector("#accessSectionsDesligado").hidden
   document.querySelectorAll('[data-conditional]').length
   ```

---

## 📞 Suporte

Se encontrar algum problema:
1. Verifique o console do navegador (F12)
2. Verifique se todos os IDs estão presentes no HTML
3. Verifique se o arquivo `app.js` foi carregado corretamente

---

**Versão:** 1.0 - Correções de Lógica Condicional e Modal de Renomeação
**Data:** 27/05/2026
