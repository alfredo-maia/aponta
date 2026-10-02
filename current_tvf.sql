
CREATE FUNCTION TF_DM_DRE_REALIZADO_OTIMIZADA(@DTINI DATETIME, @DTFIM DATETIME)
RETURNS TABLE AS RETURN (    
SELECT
    W.CODGRUPO,
    W.GRAU,
    W.CONTA,
    W.CODCENCUS,
    W.REFERENCIA,
    W.CODEMP,
    W.GRUPO,
    W.CODCTACTB,
    SUM(W.MAQCE) AS MAQCE,
    SUM(W.MAQCEPREV) AS MAQCEPREV,
    SUM(W.MAQFL) AS MAQFL,
    SUM(W.MAQFLPREV) AS MAQFLPREV,
    SUM(W.MAQUSA) AS MAQUSA,
    SUM(W.MAQUSAPREV) AS MAQUSAPREV,
    SUM(W.SERV) AS SERV,
    SUM(W.SERVPREV) AS SERVPREV,
    SUM(W.PECAS) AS PECAS,
    SUM(W.PECASPREV) AS PECASPREV,
    SUM(W.RAP) AS RAP,
    SUM(W.RAPPREV) AS RAPPREV,
    SUM(W.BELL) AS BELL,
    SUM(W.BELLPREV) AS BELLPREV,
    SUM(W.ADM) AS ADM,
    SUM(W.ADMPREV) AS ADMPREV,
    SUM(W.PCOLD) AS PCOLD,
    SUM(W.PCOLDPREV) AS PCOLDPREV,
    SUM(W.MAQUSAOLD) AS MAQUSAOLD,
    SUM(W.MAQUSAOLDPREV) AS MAQUSAOLDPREV,
    SUM(w.PESADOS) AS PESADOS,
    SUM(W.PESADOSPREV) AS PESADOSPREV,
    SUM(W.TRACAO) AS TRACAO,
    SUM(W.TRACAOPREV) AS TRACAOPREV,
    SUM(W.ANTECIPA) AS ANTECIPA,
    SUM(W.ANTECIPAPREV) AS ANTECIPAPREV,
    SUM(W.VLRTOTAL) AS VLRTOTAL,
    SUM(W.VLRPREV) AS VLRPREV
FROM (
    SELECT
         E.*
    
FROM
    (
        SELECT
            X.CODGRUPO,
    
            X.GRAU,
    
            X.CONTA,
    
            X.CODCENCUS,
    
            X.REFERENCIA,
    
            X.CODEMP,
    
            X.GRUPO,
    
            X.CODCTACTB,
    
            SUM(X.MAQCE) AS MAQCE,
    
            SUM(X.MAQCEPREV) AS MAQCEPREV,
    
            SUM(X.MAQFL) AS MAQFL,
    
            SUM(X.MAQFLPREV) AS MAQFLPREV,
    
            SUM(X.MAQUSA) AS MAQUSA,
    
            SUM(X.MAQUSAPREV) AS MAQUSAPREV,
    
            SUM(X.SERV) AS SERV,
    
            SUM(X.SERVPREV) AS SERVPREV,
    
            SUM(X.PECAS) AS PECAS,
    
            SUM(X.PECASPREV) AS PECASPREV,
    
            SUM(X.RAP) AS RAP,
    
            SUM(X.RAPPREV) AS RAPPREV,
    
            SUM(X.BELL) AS BELL,
    
            SUM(X.BELLPREV) AS BELLPREV,
    
            SUM(X.ADM) AS ADM,
    
            SUM(X.ADMPREV) AS ADMPREV,
    
            SUM(X.PCOLD) AS PCOLD,
    
            SUM(X.PCOLDPREV) AS PCOLDPREV,
    
            SUM(X.MAQUSAOLD) AS MAQUSAOLD,
    
            SUM(X.MAQUSAOLDPREV) AS MAQUSAOLDPREV,
    
            SUM(X.PESADOS) AS PESADOS,
    
            SUM(X.PESADOSPREV) AS PESADOSPREV,
    
            SUM(X.TRACAO) AS TRACAO,
    
            SUM(X.TRACAOPREV) AS TRACAOPREV,
    
            SUM(X.ANTECIPA) AS ANTECIPA,
    
            SUM(X.ANTECIPAPREV) AS ANTECIPAPREV,
    
            SUM(X.VLRTOTAL) AS VLRTOTAL,
    
            SUM(X.VLRPREV) AS VLRPREV
        
FROM
    (
            SELECT
                T.CODGRUPO,
    
                T.GRAU,
    
                T.CONTA,
    
                T.CODCENCUS,
    
                T.REFERENCIA,
    
                T.CODEMP,
    
                T.GRUPO,
    
                T.CODCTACTB,
    
                SUM(CASE 
        WHEN T.GRUPO = 1 THEN T.VLRTOTAL 
        ELSE 0 
    END) AS MAQCE,
    
                SUM(CASE 
        WHEN T.GRUPO = 1 THEN T.VLRPREV 
        ELSE 0 
    END) AS MAQCEPREV,
    
                SUM(CASE 
        WHEN T.GRUPO = 2 THEN T.VLRTOTAL 
        ELSE 0 
    END) AS MAQFL,
    
                SUM(CASE 
        WHEN T.GRUPO = 2 THEN T.VLRPREV 
        ELSE 0 
    END) AS MAQFLPREV,
    
                SUM(CASE 
        WHEN T.GRUPO = 3 THEN T.VLRTOTAL 
        ELSE 0 
    END) AS MAQUSA,
    
                SUM(CASE 
        WHEN T.GRUPO = 3 THEN T.VLRPREV 
        ELSE 0 
    END) AS MAQUSAPREV,
    
                SUM(CASE 
        WHEN T.GRUPO = 4 THEN T.VLRTOTAL 
        ELSE 0 
    END) AS SERV,
    
                SUM(CASE 
        WHEN T.GRUPO = 4 THEN T.VLRPREV 
        ELSE 0 
    END) AS SERVPREV,
    
                SUM(CASE 
        WHEN T.GRUPO = 5 THEN T.VLRTOTAL 
        ELSE 0 
    END) AS PECAS,
    
                SUM(CASE 
        WHEN T.GRUPO = 5 THEN T.VLRPREV 
        ELSE 0 
    END) AS PECASPREV,
    
                SUM(CASE 
        WHEN T.GRUPO = 6 THEN T.VLRTOTAL 
        ELSE 0 
    END) AS RAP,
    
                SUM(CASE 
        WHEN T.GRUPO = 6 THEN T.VLRPREV 
        ELSE 0 
    END) AS RAPPREV,
    
                SUM(CASE 
        WHEN T.GRUPO = 7 THEN T.VLRTOTAL 
        ELSE 0 
    END) AS BELL,
    
                SUM(CASE 
        WHEN T.GRUPO = 7 THEN T.VLRPREV 
        ELSE 0 
    END) AS BELLPREV,
    
                SUM(CASE 
        WHEN T.GRUPO = 8 THEN T.VLRTOTAL 
        ELSE 0 
    END) AS ADM,
    
                SUM(CASE 
        WHEN T.GRUPO = 8 THEN T.VLRPREV 
        ELSE 0 
    END) AS ADMPREV,
    
                SUM(CASE 
        WHEN T.GRUPO = 9 THEN T.VLRTOTAL 
        ELSE 0 
    END) AS PCOLD,
    
                SUM(CASE 
        WHEN T.GRUPO = 9 THEN T.VLRPREV 
        ELSE 0 
    END) AS PCOLDPREV,
    
                SUM(CASE 
        WHEN T.GRUPO = 10 THEN T.VLRTOTAL 
        ELSE 0 
    END) AS MAQUSAOLD,
    
                SUM(CASE 
        WHEN T.GRUPO = 10 THEN T.VLRPREV 
        ELSE 0 
    END) AS MAQUSAOLDPREV,
    
                SUM(CASE 
        WHEN T.GRUPO = 11 THEN T.VLRTOTAL 
        ELSE 0 
    END) AS PESADOS,
    
                SUM(CASE 
        WHEN T.GRUPO = 11 THEN T.VLRPREV 
        ELSE 0 
    END) AS PESADOSPREV,
    
                SUM(CASE 
        WHEN T.GRUPO = 12 THEN T.VLRTOTAL 
        ELSE 0 
    END) AS TRACAO,
    
                SUM(CASE 
        WHEN T.GRUPO = 12 THEN T.VLRPREV 
        ELSE 0 
    END) AS TRACAOPREV,
    
                SUM(CASE 
        WHEN T.GRUPO = 13 THEN T.VLRTOTAL 
        ELSE 0 
    END) AS ANTECIPA,
    
                SUM(CASE 
        WHEN T.GRUPO = 13 THEN T.VLRPREV 
        ELSE 0 
    END) AS ANTECIPAPREV,
    
                SUM(T.VLRTOTAL) AS VLRTOTAL,
    
                SUM(T.VLRPREV) AS VLRPREV
            
FROM
    (
                SELECT
                    *
                
FROM
    TF_TCP_DRE_MSTVF(@DTINI, @DTFIM) EWE
                
WHERE
    NOT (EWE.GRUPO = 8 
    AND CODGRUPO < 16000000)
                    
    AND NOT (EWE.GRUPO = 8 
    AND CODGRUPO IN (18000000, 20000000))
            ) T
            
GROUP BY
    T.CODGRUPO,
    
                T.GRAU,
    
                T.CONTA,
    
                T.CODCENCUS,
    
                T.REFERENCIA,
    
                T.CODEMP,
    
                T.GRUPO,
    
                T.CODCTACTB
        ) X
        
GROUP BY
    X.CODGRUPO,
    
            X.GRAU,
    
            X.CONTA,
    
            X.CODCENCUS,
    
            X.REFERENCIA,
    
            X.CODEMP,
    
            X.GRUPO,
    
            X.CODCTACTB
    ) E
    
UNION
ALL ------------------------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------------------------
    SELECT
        E.* 
    
FROM
(
        SELECT
            X.CODGRUPO,

            X.GRAU,

            X.CONTA,

            X.CODCENCUS,

            X.REFERENCIA,

            X.CODEMP,

            X.GRUPO,

            X.CODCTACTB,

            SUM(X.MAQCE) AS MAQCE,

            SUM(X.MAQCEPREV) AS MAQCEPREV,

            SUM(X.MAQFL) AS MAQFL,

            SUM(X.MAQFLPREV) AS MAQFLPREV,

            SUM(X.MAQUSA) AS MAQUSA,

            SUM(X.MAQUSAPREV) AS MAQUSAPREV,

            SUM(X.SERV) AS SERV,

            SUM(X.SERVPREV) AS SERVPREV,

            SUM(X.PECAS) AS PECAS,

            SUM(X.PECASPREV) AS PECASPREV,

            SUM(X.RAP) AS RAP,

            SUM(X.RAPPREV) AS RAPPREV,

            SUM(X.BELL) AS BELL,

            SUM(X.BELLPREV) AS BELLPREV,

            SUM(X.ADM) AS ADM,

            SUM(X.ADMPREV) AS ADMPREV,

            SUM(X.PCOLD) AS PCOLD,

            SUM(X.PCOLDPREV) AS PCOLDPREV,

            SUM(X.MAQUSAOLD) AS MAQUSAOLD,

            SUM(X.MAQUSAOLDPREV) AS MAQUSAOLDPREV,

            SUM(X.PESADOS) AS PESADOS,

            SUM(X.PESADOSPREV) AS PESADOSPREV,

            SUM(X.TRACAO) AS TRACAO,

            SUM(X.TRACAOPREV) AS TRACAOPREV,

            SUM(X.ANTECIPA) AS ANTECIPA,

            SUM(X.ANTECIPAPREV) AS ANTECIPAPREV,

            SUM(X.VLRTOTAL) AS VLRTOTAL,

            0 AS VLRPREV
        
FROM
(
            SELECT
                T.CODGRUPO,

                T.GRAU,

                T.CONTA,

                T.CODCENCUS,

                T.REFERENCIA,

                T.CODEMP,

                T.GRUPO,

                T.CODCTACTB,

                SUM(CASE 
    WHEN T.NOVOGRUPO = 1 THEN T.VLRTOTAL 
    ELSE 0 
END) AS MAQCE,

                0 AS MAQCEPREV,

                SUM(CASE 
    WHEN T.NOVOGRUPO = 2 THEN T.VLRTOTAL 
    ELSE 0 
END) AS MAQFL,

                0 AS MAQFLPREV,

                SUM(CASE 
    WHEN T.NOVOGRUPO = 3 THEN T.VLRTOTAL 
    ELSE 0 
END) AS MAQUSA,

                0 AS MAQUSAPREV,

                SUM(CASE 
    WHEN T.NOVOGRUPO = 4 THEN T.VLRTOTAL 
    ELSE 0 
END) AS SERV,

                0 AS SERVPREV,

                SUM(CASE 
    WHEN T.NOVOGRUPO = 5 THEN T.VLRTOTAL 
    ELSE 0 
END) AS PECAS,

                0 AS PECASPREV,

                SUM(CASE 
    WHEN T.NOVOGRUPO = 6 THEN T.VLRTOTAL 
    ELSE 0 
END) AS RAP,

                0 AS RAPPREV,

                SUM(CASE 
    WHEN T.NOVOGRUPO = 7 THEN T.VLRTOTAL 
    ELSE 0 
END) AS BELL,

                0 AS BELLPREV,

                SUM(CASE 
    WHEN T.NOVOGRUPO = 8 THEN T.VLRTOTAL 
    ELSE 0 
END) AS ADM,

                0 AS ADMPREV,

                SUM(CASE 
    WHEN T.NOVOGRUPO = 9 THEN T.VLRTOTAL 
    ELSE 0 
END) AS PCOLD,

                0 AS PCOLDPREV,

                SUM(CASE 
    WHEN T.NOVOGRUPO = 10 THEN T.VLRTOTAL 
    ELSE 0 
END) AS MAQUSAOLD,

                0 AS MAQUSAOLDPREV,

                SUM(CASE 
    WHEN T.NOVOGRUPO = 11 THEN T.VLRTOTAL 
    ELSE 0 
END) AS PESADOS,

                0 AS PESADOSPREV,

                SUM(CASE 
    WHEN T.NOVOGRUPO = 12 THEN T.VLRTOTAL 
    ELSE 0 
END) AS TRACAO,

                0 TRACAOPREV,

                SUM(CASE 
    WHEN T.NOVOGRUPO = 13 THEN T.VLRTOTAL 
    ELSE 0 
END) AS ANTECIPA,

                0 AS ANTECIPAPREV,

                SUM(T.VLRTOTAL) AS VLRTOTAL
            
FROM
(
                SELECT
                    EWE.*
                
FROM
AD_DRE_ADM EWE
                
WHERE
EWE.NOVOGRUPO IS NOT NULL
            ) T
            
GROUP BY
T.CODGRUPO,

                T.GRAU,

                T.CONTA,

                T.CODCENCUS,

                T.REFERENCIA,

                T.CODEMP,

                T.GRUPO,

                T.CODCTACTB
        ) X
        
GROUP BY
X.CODGRUPO,

            X.GRAU,

            X.CONTA,

            X.CODCENCUS,

            X.REFERENCIA,

            X.CODEMP,

            X.GRUPO,

            X.CODCTACTB
    ) E
    
UNION
ALL
    SELECT
         E.*
    
FROM
(
        SELECT
            X.CODGRUPO,

            X.GRAU,

            X.CONTA,

            X.CODCENCUS,

            X.REFERENCIA,

            X.CODEMP,

            X.GRUPO,

            X.CODCTACTB,

            SUM(X.MAQCE) AS MAQCE,

            SUM(X.MAQCEPREV) AS MAQCEPREV,

            SUM(X.MAQFL) AS MAQFL,

            SUM(X.MAQFLPREV) AS MAQFLPREV,

            SUM(X.MAQUSA) AS MAQUSA,

            SUM(X.MAQUSAPREV) AS MAQUSAPREV,

            SUM(X.SERV) AS SERV,

            SUM(X.SERVPREV) AS SERVPREV,

            SUM(X.PECAS) AS PECAS,

            SUM(X.PECASPREV) AS PECASPREV,

            SUM(X.RAP) AS RAP,

            SUM(X.RAPPREV) AS RAPPREV,

            SUM(X.BELL) AS BELL,

            SUM(X.BELLPREV) AS BELLPREV,

            SUM(X.ADM) AS ADM,

            SUM(X.ADMPREV) AS ADMPREV,

            SUM(X.PCOLD) AS PCOLD,

            SUM(X.PCOLDPREV) AS PCOLDPREV,

            SUM(X.MAQUSAOLD) AS MAQUSAOLD,

            SUM(X.MAQUSAOLDPREV) AS MAQUSAOLDPREV,

            SUM(X.PESADOS) AS PESADOS,

            SUM(X.PESADOSPREV) AS PESADOSPREV,

            SUM(X.TRACAO) AS TRACAO,

            SUM(X.TRACAOPREV) AS TRACAOPREV,

            SUM(X.ANTECIPA) AS ANTECIPA,

            SUM(X.ANTECIPAPREV) AS ANTECIPAPREV,

            0 AS VLRTOTAL,

            0 AS VLRPREV
        
FROM
(
            SELECT
                16000000 CODGRUPO,

                1 GRAU,

                '(=) EBITDA' CONTA,

                T.CODCENCUS,

                T.REFERENCIA,

                T.CODEMP,

                T.GRUPO,

                T.CODCTACTB,

                SUM(CASE 
WHEN T.NOVOGRUPO = 1 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQCE,

                0 AS MAQCEPREV,

                SUM(CASE 
WHEN T.NOVOGRUPO = 2 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQFL,

                0 AS MAQFLPREV,

                SUM(CASE 
WHEN T.NOVOGRUPO = 3 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQUSA,

                0 AS MAQUSAPREV,

                SUM(CASE 
WHEN T.NOVOGRUPO = 4 THEN T.VLRTOTAL 
ELSE 0 
END) AS SERV,

                0 AS SERVPREV,

                SUM(CASE 
WHEN T.NOVOGRUPO = 5 THEN T.VLRTOTAL 
ELSE 0 
END) AS PECAS,

                0 AS PECASPREV,

                SUM(CASE 
WHEN T.NOVOGRUPO = 6 THEN T.VLRTOTAL 
ELSE 0 
END) AS RAP,

                0 AS RAPPREV,

                SUM(CASE 
WHEN T.NOVOGRUPO = 7 THEN T.VLRTOTAL 
ELSE 0 
END) AS BELL,

                0 AS BELLPREV,

                SUM(CASE 
WHEN T.NOVOGRUPO = 8 THEN T.VLRTOTAL 
ELSE 0 
END) AS ADM,

                0 AS ADMPREV,

                SUM(CASE 
WHEN T.NOVOGRUPO = 9 THEN T.VLRTOTAL 
ELSE 0 
END) AS PCOLD,

                0 AS PCOLDPREV,

                SUM(CASE 
WHEN T.NOVOGRUPO = 10 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQUSAOLD,

                0 AS MAQUSAOLDPREV,

                SUM(CASE 
WHEN T.NOVOGRUPO = 11 THEN T.VLRTOTAL 
ELSE 0 
END) AS PESADOS,

                0 AS PESADOSPREV,

                SUM(CASE 
WHEN T.NOVOGRUPO = 12 THEN T.VLRTOTAL 
ELSE 0 
END) AS TRACAO,

                0 TRACAOPREV,

                SUM(CASE 
WHEN T.NOVOGRUPO = 13 THEN T.VLRTOTAL 
ELSE 0 
END) AS ANTECIPA,

                0 AS ANTECIPAPREV,

                SUM(T.VLRTOTAL) AS VLRTOTAL
            
FROM
(
                SELECT
                    EWE.*
                
FROM
AD_DRE_ADM EWE
                
WHERE
EWE.NOVOGRUPO IS NOT NULL
                    
AND EWE.CODGRUPO = 12000000
            ) T
            
GROUP BY
T.CODGRUPO,

                T.GRAU,

                T.CONTA,

                T.CODCENCUS,

                T.REFERENCIA,

                T.CODEMP,

                T.GRUPO,

                T.CODCTACTB
            
UNION
ALL
            SELECT
                19000000 CODGRUPO,
                1 GRAU,
                '(=) LUCRO OPERACIONAL/ EBIT' CONTA,
                T.CODCENCUS,
                T.REFERENCIA,
                T.CODEMP,
                T.GRUPO,
                T.CODCTACTB,
                SUM(CASE 
WHEN T.NOVOGRUPO = 1 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQCE,
                0 AS MAQCEPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 2 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQFL,
                0 AS MAQFLPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 3 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQUSA,
                0 AS MAQUSAPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 4 THEN T.VLRTOTAL 
ELSE 0 
END) AS SERV,
                0 AS SERVPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 5 THEN T.VLRTOTAL 
ELSE 0 
END) AS PECAS,
                0 AS PECASPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 6 THEN T.VLRTOTAL 
ELSE 0 
END) AS RAP,
                0 AS RAPPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 7 THEN T.VLRTOTAL 
ELSE 0 
END) AS BELL,
                0 AS BELLPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 8 THEN T.VLRTOTAL 
ELSE 0 
END) AS ADM,
                0 AS ADMPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 9 THEN T.VLRTOTAL 
ELSE 0 
END) AS PCOLD,
                0 AS PCOLDPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 10 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQUSAOLD,
                0 AS MAQUSAOLDPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 11 THEN T.VLRTOTAL 
ELSE 0 
END) AS PESADOS,
                0 AS PESADOSPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 12 THEN T.VLRTOTAL 
ELSE 0 
END) AS TRACAO,
                0 TRACAOPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 13 THEN T.VLRTOTAL 
ELSE 0 
END) AS ANTECIPA,
                0 AS ANTECIPAPREV,
                0 AS VLRTOTAL
            
FROM
(
                SELECT
                    EWE.*
                
FROM
AD_DRE_ADM EWE
                
WHERE
EWE.NOVOGRUPO IS NOT NULL
                    
AND EWE.CODGRUPO IN (12000000, 18000000)
            ) T
            
GROUP BY
T.CODGRUPO,

                T.GRAU,

                T.CONTA,

                T.CODCENCUS,

                T.REFERENCIA,

                T.CODEMP,

                T.GRUPO,

                T.CODCTACTB
            
UNION
ALL --INCLUIR CONTAS DE RECEITAS E DESPESAS FINANCEIRAS
            SELECT
                21000000 CODGRUPO,
                1 GRAU,
                '(=) LAIR (LUCRO ANTES DO IR)' CONTA,
                T.CODCENCUS,
                T.REFERENCIA,
                T.CODEMP,
                T.GRUPO,
                T.CODCTACTB,
                SUM(CASE 
WHEN T.NOVOGRUPO = 1 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQCE,
                0 AS MAQCEPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 2 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQFL,
                0 AS MAQFLPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 3 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQUSA,
                0 AS MAQUSAPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 4 THEN T.VLRTOTAL 
ELSE 0 
END) AS SERV,
                0 AS SERVPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 5 THEN T.VLRTOTAL 
ELSE 0 
END) AS PECAS,
                0 AS PECASPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 6 THEN T.VLRTOTAL 
ELSE 0 
END) AS RAP,
                0 AS RAPPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 7 THEN T.VLRTOTAL 
ELSE 0 
END) AS BELL,
                0 AS BELLPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 8 THEN T.VLRTOTAL 
ELSE 0 
END) AS ADM,
                0 AS ADMPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 9 THEN T.VLRTOTAL 
ELSE 0 
END) AS PCOLD,
                0 AS PCOLDPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 10 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQUSAOLD,
                0 AS MAQUSAOLDPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 11 THEN T.VLRTOTAL 
ELSE 0 
END) AS PESADOS,
                0 AS PESADOSPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 12 THEN T.VLRTOTAL 
ELSE 0 
END) AS TRACAO,
                0 TRACAOPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 13 THEN T.VLRTOTAL 
ELSE 0 
END) AS ANTECIPA,
                0 AS ANTECIPAPREV,
                0 AS VLRTOTAL
            
FROM
(
                SELECT
                    EWE.*
                
FROM
AD_DRE_ADM EWE
                
WHERE
EWE.NOVOGRUPO IS NOT NULL
            ) T
            
GROUP BY
T.CODGRUPO,

                T.GRAU,

                T.CONTA,

                T.CODCENCUS,

                T.REFERENCIA,

                T.CODEMP,

                T.GRUPO,

                T.CODCTACTB
            

UNION
ALL --INCLUIR CONTAS DE RECEITAS E DESPESAS FINANCEIRAS
            SELECT
                24000000 CODGRUPO,
                1 GRAU,
                '(=) LUCRO LÍQUIDO' CONTA,
                T.CODCENCUS,
                T.REFERENCIA,
                T.CODEMP,
                T.GRUPO,
                T.CODCTACTB,
                SUM(CASE 
WHEN T.NOVOGRUPO = 1 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQCE,
                0 AS MAQCEPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 2 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQFL,
                0 AS MAQFLPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 3 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQUSA,
                0 AS MAQUSAPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 4 THEN T.VLRTOTAL 
ELSE 0 
END) AS SERV,
                0 AS SERVPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 5 THEN T.VLRTOTAL 
ELSE 0 
END) AS PECAS,
                0 AS PECASPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 6 THEN T.VLRTOTAL 
ELSE 0 
END) AS RAP,
                0 AS RAPPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 7 THEN T.VLRTOTAL 
ELSE 0 
END) AS BELL,
                0 AS BELLPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 8 THEN T.VLRTOTAL 
ELSE 0 
END) AS ADM,
                0 AS ADMPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 9 THEN T.VLRTOTAL 
ELSE 0 
END) AS PCOLD,
                0 AS PCOLDPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 10 THEN T.VLRTOTAL 
ELSE 0 
END) AS MAQUSAOLD,
                0 AS MAQUSAOLDPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 11 THEN T.VLRTOTAL 
ELSE 0 
END) AS PESADOS,
                0 AS PESADOSPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 12 THEN T.VLRTOTAL 
ELSE 0 
END) AS TRACAO,
                0 TRACAOPREV,
                SUM(CASE 
WHEN T.NOVOGRUPO = 13 THEN T.VLRTOTAL 
ELSE 0 
END) AS ANTECIPA,
                0 AS ANTECIPAPREV,
                0 AS VLRTOTAL
            
FROM
(
                SELECT
                    EWE.*
                
FROM
AD_DRE_ADM EWE
                
WHERE
EWE.NOVOGRUPO IS NOT NULL
            ) T
            
GROUP BY
T.CODGRUPO,

                T.GRAU,

                T.CONTA,

                T.CODCENCUS,

                T.REFERENCIA,

                T.CODEMP,

                T.GRUPO,

                T.CODCTACTB
        ) X
        
GROUP BY
X.CODGRUPO,

            X.GRAU,

            X.CONTA,

            X.CODCENCUS,

            X.REFERENCIA,

            X.CODEMP,

            X.GRUPO,

            X.CODCTACTB
    ) E 
) W
GROUP 
BY
W.CODGRUPO,

    W.GRAU,

    W.CONTA,

    W.CODCENCUS,

    W.REFERENCIA,

    W.CODEMP,

    W.GRUPO,

    W.CODCTACTB
)
